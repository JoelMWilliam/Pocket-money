import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
  requestNotificationPermission: vi.fn(),
  scheduleBudgetAlert: vi.fn(),
  cancelBudgetAlert: vi.fn(),
  idHash: vi.fn((s) => s.length)
}))
vi.mock('../src/lib/crypto', () => ({
  hashPin: vi.fn(async (pin) => `mock-hash-${pin}`),
  verifyPin: vi.fn(async (pin, hash) => hash === `mock-hash-${pin}`),
  encryptData: vi.fn((d) => d),
  decryptData: vi.fn((d) => d),
  generateRandomId: vi.fn(() => 'mock-id')
}))
vi.mock('dompurify', () => ({
  default: { sanitize: (s) => s }
}))

import AuthScreen from '../src/components/AuthScreen'
import { useAppStore } from '../src/store/useAppStore'

async function resetStore() {
  useAppStore.setState({
    auth: { currentUser: null, isLocked: false, lockAt: null, users: {} },
    usersData: {},
    settings: { seedColor: '#0A84FF', isDark: true, currency: 'LKR', lastBudgetMonth: null, updatedAt: Date.now() },
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
    rules: []
  })
}

describe('AuthScreen', () => {
  beforeEach(async () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
    await resetStore()
  })

  it('renders the app title "Pocket Money"', () => {
    render(<AuthScreen />)
    expect(screen.getByText('Pocket Money')).toBeInTheDocument()
  })

  it('shows create account form when no users exist', () => {
    render(<AuthScreen />)
    expect(screen.getByText('Create Account')).toBeInTheDocument()
    expect(screen.queryByText('Unlock')).not.toBeInTheDocument()
  })

  it('shows error when creating with empty username', async () => {
    render(<AuthScreen />)
    await userEvent.click(screen.getByText('Create Account'))
    expect(await screen.findByText('Enter a username')).toBeInTheDocument()
  })

  it('shows error when PIN is too short', async () => {
    render(<AuthScreen />)
    await userEvent.type(screen.getByPlaceholderText('Your name'), 'testuser')
    await userEvent.type(screen.getAllByPlaceholderText('••••')[0], '12')
    await userEvent.click(screen.getByText('Create Account'))
    expect(await screen.findByText('PIN must be at least 4 digits')).toBeInTheDocument()
  })

  it('shows error when PINs do not match', async () => {
    render(<AuthScreen />)
    await userEvent.type(screen.getByPlaceholderText('Your name'), 'testuser')
    const [pinInput, confirmInput] = screen.getAllByPlaceholderText('••••')
    await userEvent.type(pinInput, '1234')
    await userEvent.type(confirmInput, '5678')
    await userEvent.click(screen.getByText('Create Account'))
    expect(await screen.findByText('PINs do not match')).toBeInTheDocument()
  })

  it('shows user selection dropdown when users exist', async () => {
    await useAppStore.getState().createUser('testuser', '1234')
    useAppStore.setState((s) => ({ auth: { ...s.auth, currentUser: null } }))
    render(<AuthScreen />)
    expect(screen.getByText('Select user')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'testuser' })).toBeInTheDocument()
  })

  it('displays number of users on device', async () => {
    await useAppStore.getState().createUser('alice', '1111')
    useAppStore.setState((s) => ({ auth: { ...s.auth, currentUser: null } }))
    await useAppStore.getState().createUser('bob', '2222')
    useAppStore.setState((s) => ({ auth: { ...s.auth, currentUser: null } }))
    render(<AuthScreen />)
    expect(screen.getByText('2 users on this device')).toBeInTheDocument()
  })

  it('can create a user and then shows login form after logout', async () => {
    const { rerender } = render(<AuthScreen />)
    expect(screen.getByText('Create Account')).toBeInTheDocument()

    await useAppStore.getState().createUser('testuser', '1234')
    useAppStore.setState((s) => ({ auth: { ...s.auth, currentUser: null } }))

    rerender(<AuthScreen />)
    expect(screen.getByText('Unlock')).toBeInTheDocument()
    expect(screen.getByText('Select user')).toBeInTheDocument()
    expect(screen.getByText('1 user on this device')).toBeInTheDocument()
  })
})
