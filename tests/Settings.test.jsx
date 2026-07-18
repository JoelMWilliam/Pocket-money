import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockStorage = {}
vi.mock('../src/lib/storage', async () => ({
  zustandStorage: {
    getItem: async (name) => mockStorage[name] ?? null,
    setItem: async (name, value) => { mockStorage[name] = value },
    removeItem: async (name) => { delete mockStorage[name] }
  },
  storageGet: async (key, fallback = null) => mockStorage[key] ?? fallback,
  storageSet: async (key, value) => { mockStorage[key] = value },
  storageRemove: async (key) => { delete mockStorage[key] },
  storageKeys: async () => Object.keys(mockStorage),
  storageClear: async () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]) }
}))

vi.mock('@capacitor/preferences', () => ({
  Preferences: { get: vi.fn(), set: vi.fn(), remove: vi.fn(), keys: vi.fn(), clear: vi.fn() }
}))
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
  registerPlugin: vi.fn(() => ({}))
}))

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react')
  const mockIcons = [
    'Moon', 'Palette', 'Download', 'Upload', 'X', 'RefreshCcw', 'Info',
    'Github', 'ChevronRight', 'Lock', 'Users', 'LogOut', 'Shield', 'FileLock',
    'Share2', 'Cloud', 'ArrowUp', 'ArrowDown', 'HeartPulse', 'Fingerprint',
    'Bell', 'FileText', 'Mail', 'MessageSquare', 'User', 'Sun'
  ]
  const mockModule = {}
  for (const key of Object.keys(actual)) {
    mockModule[key] = mockIcons.includes(key)
      ? () => <div data-testid={`icon-${key}`} />
      : actual[key]
  }
  return mockModule
})

vi.mock('../src/lib/theme', () => ({
  PRESET_COLORS: [
    { name: 'Ocean', value: '#0A84FF' },
    { name: 'Cobalt', value: '#5E5CE6' },
    { name: 'Teal', value: '#64D2FF' },
    { name: 'Mint', value: '#30D158' },
    { name: 'Gold', value: '#FFCC00' },
    { name: 'Orange', value: '#FF9500' },
    { name: 'Pink', value: '#FF375F' },
    { name: 'Purple', value: '#BF5AF2' }
  ]
}))

vi.mock('../src/components/AvatarPicker', () => ({
  default: () => <div data-testid="avatar-picker" />
}))
vi.mock('../src/components/GoogleDriveBackup', () => ({
  default: () => <div data-testid="google-drive-backup" />
}))
vi.mock('../src/components/SmsParser', () => ({
  default: ({ onClose }) => <div data-testid="sms-parser" />
}))
vi.mock('../src/components/ModalRoot', () => ({
  RegisterModal: () => null
}))

vi.mock('../src/lib/receipts', () => ({
  deleteTransactionReceipts: vi.fn(),
  inlineReceipts: vi.fn((d) => d),
  extractReceipts: vi.fn((d) => d),
  migrateReceiptsToIndexedDB: vi.fn()
}))
vi.mock('../src/lib/notifications', () => ({
  scheduleBillReminder: vi.fn(),
  cancelNotifications: vi.fn(),
  cancelAllNotifications: vi.fn(),
  scheduleDailyReminder: vi.fn(),
  scheduleReportNotification: vi.fn(),
  requestNotificationPermission: vi.fn(),
  scheduleBudgetAlert: vi.fn(),
  cancelBudgetAlert: vi.fn(),
  idHash: vi.fn((s) => s.length)
}))
vi.mock('../src/lib/export', () => ({
  exportToJSON: vi.fn(() => Promise.resolve()),
  exportTransactionsToCSV: vi.fn(() => Promise.resolve()),
  readJSONFile: vi.fn(() => Promise.resolve({})),
  exportEncryptedBackup: vi.fn(() => Promise.resolve()),
  readEncryptedBackupFile: vi.fn(() => Promise.resolve({})),
  validateBackupData: vi.fn(),
  sanitizeImportedSettings: vi.fn((s) => s)
}))
vi.mock('../src/lib/googleDrive', () => ({
  signInToGoogleDrive: vi.fn(() => Promise.reject(new Error('Google Drive not available'))),
  isGoogleDriveConfigured: vi.fn(() => false),
  getValidAccessToken: vi.fn(() => Promise.resolve(null)),
  uploadBackupToDrive: vi.fn(() => Promise.reject(new Error('Not authenticated'))),
  downloadBackupFromDrive: vi.fn(() => Promise.reject(new Error('Not authenticated'))),
  signOutFromGoogleDrive: vi.fn(() => Promise.resolve())
}))
vi.mock('../src/lib/email', () => ({
  sendEmailReport: vi.fn(() => Promise.resolve(true)),
  buildEmailReport: vi.fn(() => ({ subject: 'Test', html: '<p>Test</p>', text: 'Test' }))
}))
vi.mock('../src/lib/pdf', () => ({
  exportPDFReport: vi.fn(() => Promise.resolve(true))
}))
vi.mock('../src/lib/share', () => ({
  downloadOrShare: vi.fn(() => Promise.resolve(true)),
  nativeShare: vi.fn(() => Promise.resolve(true)),
  canNativeShare: vi.fn(() => false)
}))
vi.mock('../src/lib/biometric', () => ({
  canUseBiometrics: vi.fn(() => Promise.resolve(false))
}))
vi.mock('../src/lib/sms', () => ({
  maybeAutoImportSms: vi.fn(() => Promise.resolve([]))
}))
vi.mock('../src/lib/api', () => ({
  cloudAuth: {
    login: vi.fn(() => Promise.resolve({ username: 'test', token: 'token' })),
    register: vi.fn(() => Promise.resolve({ username: 'test', token: 'token' }))
  },
  cloudSync: {
    get: vi.fn(() => Promise.resolve(null)),
    put: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve())
  },
  getCloudToken: vi.fn(() => null),
  setCloudToken: vi.fn(),
  getCloudUser: vi.fn(() => null),
  setCloudUser: vi.fn()
}))

import Settings from '../src/components/Settings'
import { useAppStore } from '../src/store/useAppStore'

const defaultSettings = {
  seedColor: '#0A84FF',
  isDark: true,
  currency: 'LKR',
  lastBudgetMonth: null,
  onboardingComplete: true,
  onboardingGoal: null,
  googleDriveBackupEnabled: false,
  googleDriveBackupInterval: 'daily',
  googleDriveBackupLastAt: null,
  googleDriveBackupEmail: null,
  smsAutoImportEnabled: false,
  smsLastImportedAt: null,
  smsImportedIds: [],
  notificationsEnabled: false,
  updatedAt: Date.now()
}

async function resetStore(overrides = {}) {
  useAppStore.setState({
    auth: {
      currentUser: 'testuser',
      isLocked: false,
      lockAt: null,
      users: {
        testuser: { pinHash: 'mock-hash-1234', biometricEnabled: false, failedPinAttempts: 0, lockedUntil: null, avatar: null, createdAt: Date.now() }
      }
    },
    usersData: {},
    settings: { ...defaultSettings },
    accounts: [],
    categories: [],
    transactions: [],
    budgets: [],
    goals: [],
    debts: [],
    recurring: [],
    investments: [],
    loans: [],
    templates: [],
    rules: [],
    cloudUser: null,
    cloudToken: null,
    lastSyncAt: null,
    syncStatus: null,
    ...overrides
  })
}

describe('Settings', () => {
  beforeEach(async () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
    await resetStore()
  })

  it('renders the title "Settings"', () => {
    render(<Settings />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders the accent color and dark mode UI', () => {
    render(<Settings />)
    expect(screen.getByText('Accent Color')).toBeInTheDocument()
    expect(screen.getByText('Dark Mode')).toBeInTheDocument()
  })

  it('renders backup and export buttons', () => {
    render(<Settings />)
    expect(screen.getByText('Export Backup (JSON)')).toBeInTheDocument()
    expect(screen.getByText('Import Backup (JSON)')).toBeInTheDocument()
    expect(screen.getByText('Export Transactions (CSV)')).toBeInTheDocument()
  })

  it('renders PDF and Email report buttons', () => {
    render(<Settings />)
    expect(screen.getByText('Export PDF Report')).toBeInTheDocument()
    expect(screen.getByText('Email Monthly Report')).toBeInTheDocument()
  })

  it('renders the users section', () => {
    render(<Settings />)
    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(screen.getByText('Manage local accounts')).toBeInTheDocument()
  })

  it('shows user count', () => {
    render(<Settings />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders cloud sync section', () => {
    render(<Settings />)
    expect(screen.getByText('Cloud Sync')).toBeInTheDocument()
  })

  it('renders encrypted backup section', () => {
    render(<Settings />)
    expect(screen.getByText('Export Encrypted Backup')).toBeInTheDocument()
    expect(screen.getByText('Import Encrypted Backup')).toBeInTheDocument()
  })

  it('renders the app version', () => {
    render(<Settings />)
    expect(screen.getByText('Pocket Money v0.2.0')).toBeInTheDocument()
  })

  it('renders reset to demo data button', () => {
    render(<Settings />)
    expect(screen.getByText('Reset to Demo Data')).toBeInTheDocument()
  })

  it('opens theme modal when clicking Accent Color', async () => {
    render(<Settings />)
    await userEvent.click(screen.getByText('Accent Color'))
    expect(screen.getByText('Custom Color')).toBeInTheDocument()
    expect(screen.getByText('Ocean')).toBeInTheDocument()
  })

  it('shows user count of 2 when multiple users exist', async () => {
    await resetStore({
      auth: {
        currentUser: 'alice',
        isLocked: false,
        lockAt: null,
        users: {
          alice: { pinHash: 'mock-hash-1111', biometricEnabled: false, failedPinAttempts: 0, lockedUntil: null, avatar: null, createdAt: Date.now() },
          bob: { pinHash: 'mock-hash-2222', biometricEnabled: false, failedPinAttempts: 0, lockedUntil: null, avatar: null, createdAt: Date.now() }
        }
      }
    })
    render(<Settings />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
