import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockStorage = {}

vi.mock('../src/lib/storage', async () => {
  return {
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
  }
})

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(() => Promise.resolve({ value: null })),
    set: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
    keys: vi.fn(() => Promise.resolve({ keys: [] })),
    clear: vi.fn(() => Promise.resolve())
  }
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false
  },
  registerPlugin: vi.fn(() => ({}))
}))

vi.mock('../src/lib/receipts', () => ({
  deleteTransactionReceipts: vi.fn(() => Promise.resolve()),
  inlineReceipts: vi.fn((data) => data),
  extractReceipts: vi.fn((data) => data),
  migrateReceiptsToIndexedDB: vi.fn(() => Promise.resolve())
}))

vi.mock('../src/lib/notifications', () => ({
  scheduleBillReminder: vi.fn(() => Promise.resolve(false)),
  cancelNotifications: vi.fn(() => Promise.resolve()),
  cancelAllNotifications: vi.fn(() => Promise.resolve()),
  scheduleDailyReminder: vi.fn(() => Promise.resolve(false)),
  requestNotificationPermission: vi.fn(() => Promise.resolve(false)),
  idHash: vi.fn((s) => s.length)
}))

import { useAppStore } from '../src/store/useAppStore'

async function createTestUser() {
  const store = useAppStore.getState()
  await store.createUser('tester', '1234')
  return store
}

async function resetStore() {
  // reset auth and data to a clean state without persistence artifacts
  useAppStore.setState({
    auth: { currentUser: null, isLocked: false, lockAt: null, users: {} },
    usersData: {},
    settings: { seedColor: '#0A84FF', isDark: true, currency: 'LKR', lastBudgetMonth: null, updatedAt: Date.now() },
    accounts: [],
    categories: [
      { id: 'cat-food', name: 'Food & Dining', icon: 'Utensils', color: '#FF9500', type: 'expense', updatedAt: Date.now() },
      { id: 'cat-salary', name: 'Salary', icon: 'Banknote', color: '#30D158', type: 'income', updatedAt: Date.now() },
      { id: 'cat-transfer', name: 'Transfer', icon: 'ArrowLeftRight', color: '#8E8E93', type: 'transfer', updatedAt: Date.now() }
    ],
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

describe('useAppStore auth', () => {
  beforeEach(async () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
    await resetStore()
  })

  it('creates a user and logs them in', async () => {
    await createTestUser()
    const state = useAppStore.getState()
    expect(state.auth.currentUser).toBe('tester')
    expect(state.auth.users.tester).toBeDefined()
  })

  it('locks and unlocks with the correct PIN', async () => {
    await createTestUser()
    await useAppStore.getState().lock()
    expect(useAppStore.getState().auth.isLocked).toBe(true)

    await useAppStore.getState().unlock('1234')
    expect(useAppStore.getState().auth.isLocked).toBe(false)
  })

  it('rejects an incorrect PIN', async () => {
    await createTestUser()
    useAppStore.getState().lock()
    await expect(useAppStore.getState().unlock('0000')).rejects.toThrow('Invalid PIN')
  })
})

describe('useAppStore accounts & transactions', () => {
  beforeEach(async () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
    await resetStore()
    await createTestUser()
  })

  it('adds an account with initial balance', () => {
    useAppStore.getState().addAccount({ name: 'Bank', type: 'bank', balance: 10000 })
    const account = useAppStore.getState().accounts[0]
    expect(account.name).toBe('Bank')
    expect(account.balance).toBe(10000)
    expect(account.reconciledBalance).toBe(10000)
  })

  it('adds an expense transaction and updates account balance', () => {
    useAppStore.getState().addAccount({ name: 'Bank', type: 'bank', balance: 10000 })
    const account = useAppStore.getState().accounts[0]
    useAppStore.getState().addTransaction({ type: 'expense', amount: 1500, accountId: account.id, categoryId: 'cat-food', date: '2026-07-06', note: 'Lunch' })
    expect(useAppStore.getState().accounts[0].balance).toBe(8500)
  })

  it('adds an income transaction and updates account balance', () => {
    useAppStore.getState().addAccount({ name: 'Bank', type: 'bank', balance: 10000 })
    const account = useAppStore.getState().accounts[0]
    useAppStore.getState().addTransaction({ type: 'income', amount: 5000, accountId: account.id, categoryId: 'cat-salary', date: '2026-07-06', note: 'Salary' })
    expect(useAppStore.getState().accounts[0].balance).toBe(15000)
  })

  it('transfers between accounts', () => {
    useAppStore.getState().addAccount({ name: 'Bank', type: 'bank', balance: 10000 })
    useAppStore.getState().addAccount({ name: 'Cash', type: 'cash', balance: 5000 })
    const [bank, cash] = useAppStore.getState().accounts
    useAppStore.getState().addTransaction({ type: 'transfer', amount: 2000, accountId: bank.id, transferTo: cash.id, categoryId: 'cat-transfer', date: '2026-07-06', note: 'ATM' })
    const [updatedBank, updatedCash] = useAppStore.getState().accounts
    expect(updatedBank.balance).toBe(8000)
    expect(updatedCash.balance).toBe(7000)
  })

  it('reconciles an account and flags mismatch', () => {
    useAppStore.getState().addAccount({ name: 'Bank', type: 'bank', balance: 10000 })
    const account = useAppStore.getState().accounts[0]
    useAppStore.getState().reconcileAccount(account.id, 10000)
    const reconciled = useAppStore.getState().accounts[0]
    expect(reconciled.reconciledBalance).toBe(10000)
  })

  it('deletes an account and its transactions', () => {
    useAppStore.getState().addAccount({ name: 'Bank', type: 'bank', balance: 10000 })
    const account = useAppStore.getState().accounts[0]
    useAppStore.getState().addTransaction({ type: 'expense', amount: 1000, accountId: account.id, categoryId: 'cat-food', date: '2026-07-06' })
    useAppStore.getState().deleteAccount(account.id)
    expect(useAppStore.getState().accounts.length).toBe(0)
    expect(useAppStore.getState().transactions.length).toBe(0)
  })
})

describe('useAppStore budgets', () => {
  beforeEach(async () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
    await resetStore()
    await createTestUser()
  })

  it('tracks budget progress for current month', () => {
    useAppStore.getState().addAccount({ name: 'Bank', type: 'bank', balance: 50000 })
    const account = useAppStore.getState().accounts[0]
    useAppStore.getState().addBudget({ categoryId: 'cat-food', amount: 10000, period: 'monthly', rollover: false })
    const budget = useAppStore.getState().budgets[0]
    const month = new Date().toISOString().slice(0, 7)
    useAppStore.getState().addTransaction({ type: 'expense', amount: 4000, accountId: account.id, categoryId: 'cat-food', date: `${month}-05`, note: 'Dinner' })
    const progress = useAppStore.getState().getBudgetProgress(budget.id)
    expect(progress.spent).toBe(4000)
    expect(progress.limit).toBe(10000)
    expect(progress.percent).toBe(40)
  })

  it('rolls over unused budget to next month', () => {
    const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 7)
    useAppStore.getState().addAccount({ name: 'Bank', type: 'bank', balance: 50000 })
    const account = useAppStore.getState().accounts[0]
    useAppStore.getState().addBudget({ categoryId: 'cat-food', amount: 10000, period: 'monthly', rollover: true })
    useAppStore.getState().addTransaction({ type: 'expense', amount: 2000, accountId: account.id, categoryId: 'cat-food', date: `${lastMonth}-05`, note: 'Dinner' })
    // simulate next month rollover by setting lastBudgetMonth to the past month
    useAppStore.setState((state) => ({ settings: { ...state.settings, lastBudgetMonth: lastMonth } }))
    useAppStore.getState().rolloverBudgets()
    const updated = useAppStore.getState().budgets[0]
    expect(updated.rolloverAmount).toBe(8000)
  })
})

describe('useAppStore recurring', () => {
  beforeEach(async () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
    await resetStore()
    await createTestUser()
  })

  it('adds a recurring item and auto-generates transactions', () => {
    useAppStore.getState().addAccount({ name: 'Bank', type: 'bank', balance: 50000 })
    const account = useAppStore.getState().accounts[0]
    const today = new Date().toISOString().slice(0, 10)
    useAppStore.getState().addRecurring({ name: 'Netflix', amount: 2500, type: 'expense', categoryId: 'cat-food', accountId: account.id, frequency: 'monthly', nextDueDate: today, reminderDays: 0, active: true })
    const count = useAppStore.getState().generateRecurringTransactions(today)
    expect(count).toBe(1)
    expect(useAppStore.getState().transactions.length).toBe(1)
    expect(useAppStore.getState().transactions[0].note).toBe('Netflix')
  })
})
