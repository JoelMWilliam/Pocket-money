import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
vi.mock('../src/lib/pdfParser', () => ({
  parsePDFText: vi.fn(),
  extractStatementBalance: vi.fn()
}))

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react')
  const mockIcons = [
    'Plus', 'Pencil', 'Trash2', 'Wallet', 'Landmark', 'CreditCard',
    'PiggyBank', 'Banknote', 'MoreHorizontal', 'RefreshCw', 'RotateCcw',
    'Check', 'X', 'ArrowUpRight', 'ArrowDownLeft', 'ArrowRightLeft',
    'Wallet2', 'Building2', 'CheckCircle2', 'Scale', 'FileUp', 'Lock',
    'CircleDollarSign', 'Coins', 'ArrowLeftRight', 'Briefcase', 'Bus',
    'Film', 'Fuel', 'Gift', 'GraduationCap', 'HandHeart', 'HeartPulse',
    'Home', 'PawPrint', 'Percent', 'PiggyBank', 'Plane', 'Receipt',
    'ShieldCheck', 'ShoppingBag', 'ShoppingCart', 'Smile', 'TrendingUp',
    'Utensils', 'Wallet', 'Wallet2'
  ]
  const mockModule = {}
  for (const key of Object.keys(actual)) {
    mockModule[key] = mockIcons.includes(key)
      ? () => <div data-testid={`icon-${key}`} />
      : actual[key]
  }
  return mockModule
})

import { useAppStore } from '../src/store/useAppStore'
import Accounts from '../src/components/Accounts'
import { ModalProvider } from '../src/contexts/ModalContext'
import { QuickAddProvider, useQuickAddAction } from '../src/contexts/QuickAddContext'

function Opener({ label = 'Open' }) {
  const action = useQuickAddAction()
  return (
    <button data-testid="opener" onClick={action}>
      {label}
    </button>
  )
}

function renderWithProviders(ui) {
  return render(
    <ModalProvider>
      <QuickAddProvider>
        <Opener label="Add Account" />
        {ui}
      </QuickAddProvider>
    </ModalProvider>
  )
}

const sampleAccounts = [
  {
    id: 'acc-1', name: 'Commercial Bank', type: 'bank', balance: 125000,
    initialBalance: 100000, color: '#0A84FF', icon: 'Building2', currency: 'LKR',
    reconciledBalance: 125000, lastReconciledAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'acc-2', name: 'Personal Wallet', type: 'wallet', balance: 5000,
    initialBalance: 5000, color: '#30D158', icon: 'Wallet2', currency: 'LKR',
    reconciledBalance: 5000, lastReconciledAt: Date.now(), updatedAt: Date.now()
  },
  {
    id: 'acc-3', name: 'Visa Credit', type: 'credit', balance: -15000,
    initialBalance: 0, color: '#FF375F', icon: 'CreditCard', currency: 'LKR',
    reconciledBalance: -15000, lastReconciledAt: Date.now(), updatedAt: Date.now()
  }
]

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

describe('Accounts', () => {
  beforeEach(async () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
    await resetStore()
  })

  it('renders "Accounts" title', () => {
    renderWithProviders(<Accounts />)
    expect(screen.getByText('Accounts')).toBeInTheDocument()
  })

  it('shows "Add Account" button', () => {
    renderWithProviders(<Accounts />)
    expect(screen.getByText('Add Account')).toBeInTheDocument()
  })

  it('renders account cards when accounts exist', () => {
    useAppStore.setState({ accounts: sampleAccounts.map((a) => ({ ...a })) })
    renderWithProviders(<Accounts />)
    expect(screen.getByText('Commercial Bank')).toBeInTheDocument()
    expect(screen.getByText('Personal Wallet')).toBeInTheDocument()
    expect(screen.getByText('Visa Credit')).toBeInTheDocument()
  })

  it('shows account name, type label, and balance for each account', () => {
    useAppStore.setState({ accounts: sampleAccounts.map((a) => ({ ...a })) })
    renderWithProviders(<Accounts />)
    expect(screen.getByText('Commercial Bank')).toBeInTheDocument()
    expect(screen.getByText('Bank')).toBeInTheDocument()
    expect(screen.getByText('LKR 125,000.00')).toBeInTheDocument()
    expect(screen.getByText('Personal Wallet')).toBeInTheDocument()
    expect(screen.getByText('Wallet')).toBeInTheDocument()
    expect(screen.getByText('LKR 5,000.00')).toBeInTheDocument()
    expect(screen.getByText('Visa Credit')).toBeInTheDocument()
    expect(screen.getByText('Credit Card')).toBeInTheDocument()
    expect(screen.getByText('-LKR 15,000.00')).toBeInTheDocument()
  })

  it('renders type labels for each account', () => {
    useAppStore.setState({ accounts: sampleAccounts.map((a) => ({ ...a })) })
    renderWithProviders(<Accounts />)
    expect(screen.getByText('Bank')).toBeInTheDocument()
    expect(screen.getByText('Wallet')).toBeInTheDocument()
    expect(screen.getByText('Credit Card')).toBeInTheDocument()
  })

  it('shows total balance', () => {
    useAppStore.setState({ accounts: sampleAccounts.map((a) => ({ ...a })) })
    renderWithProviders(<Accounts />)
    expect(screen.getByText('LKR 115,000.00')).toBeInTheDocument()
    expect(screen.getByText('Total Balance')).toBeInTheDocument()
  })

  it('can open add account form', async () => {
    renderWithProviders(<Accounts />)
    await userEvent.click(screen.getByTestId('opener'))
    expect(await screen.findByText('New Account')).toBeInTheDocument()
  })

  it('form has name, type, balance fields', async () => {
    renderWithProviders(<Accounts />)
    await userEvent.click(screen.getByTestId('opener'))
    expect(await screen.findByPlaceholderText('e.g. Commercial Bank')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Bank')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument()
  })

  it('validates empty name', async () => {
    renderWithProviders(<Accounts />)
    await userEvent.click(screen.getByTestId('opener'))
    const submitBtn = await screen.findByText('Create Account')
    const nameInput = screen.getByPlaceholderText('e.g. Commercial Bank')
    expect(nameInput).toBeRequired()
  })

  it('can save a new account', async () => {
    renderWithProviders(<Accounts />)
    await userEvent.click(screen.getByTestId('opener'))
    await userEvent.type(await screen.findByPlaceholderText('e.g. Commercial Bank'), 'Test Account')
    await userEvent.type(screen.getAllByPlaceholderText('0.00')[0], '10000')
    await userEvent.click(screen.getByText('Create Account'))
    await waitFor(() => {
      expect(screen.getByText('Test Account')).toBeInTheDocument()
    })
    expect(screen.getAllByText('LKR 10,000.00').length).toBeGreaterThanOrEqual(1)
  })

  it('can open edit account form', async () => {
    useAppStore.setState({ accounts: sampleAccounts.map((a) => ({ ...a })) })
    renderWithProviders(<Accounts />)
    await userEvent.click(screen.getByLabelText('Edit Commercial Bank'))
    expect(await screen.findByText('Edit Account')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Commercial Bank')).toBeInTheDocument()
  })

  it('can delete an account with window.confirm', async () => {
    const originalConfirm = window.confirm
    window.confirm = vi.fn(() => true)
    useAppStore.setState({ accounts: sampleAccounts.map((a) => ({ ...a })) })
    renderWithProviders(<Accounts />)
    await userEvent.click(screen.getByLabelText('Edit Commercial Bank'))
    expect(await screen.findByText('Edit Account')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Delete'))
    expect(window.confirm).toHaveBeenCalledWith('Delete this account and all its transactions?')
    await waitFor(() => {
      expect(screen.queryByText('Commercial Bank')).not.toBeInTheDocument()
    })
    window.confirm = originalConfirm
  })

  it('shows no account cards when accounts list is empty', () => {
    renderWithProviders(<Accounts />)
    expect(screen.getByText('Your money')).toBeInTheDocument()
    const cards = screen.queryByRole('button', { name: /Reconcile/i })
    expect(cards).not.toBeInTheDocument()
  })

  it('handles reconciliation flow', async () => {
    useAppStore.setState({ accounts: [sampleAccounts[0]].map((a) => ({ ...a })) })
    renderWithProviders(<Accounts />)
    const reconcileBtn = screen.getByRole('button', { name: /Reconcile Commercial Bank/i })
    await userEvent.click(reconcileBtn)
    expect(await screen.findByText(/Reconcile Commercial Bank/)).toBeInTheDocument()
    const balanceInput = screen.getByPlaceholderText('0.00')
    await userEvent.clear(balanceInput)
    await userEvent.type(balanceInput, '125000')
    await userEvent.click(screen.getByText('Mark Reconciled'))
    await waitFor(() => {
      expect(screen.queryByText(/Reconcile Commercial Bank/)).not.toBeInTheDocument()
    })
  })
})
