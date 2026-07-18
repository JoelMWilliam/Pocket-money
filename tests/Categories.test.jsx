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

vi.mock('../src/store/useAppStore', () => ({
  useAppStore: vi.fn()
}))

import { useAppStore } from '../src/store/useAppStore'
import Categories from '../src/components/Categories'
import { ModalProvider } from '../src/contexts/ModalContext'
import { QuickAddProvider, useQuickAddAction } from '../src/contexts/QuickAddContext'

const defaultCategories = [
  { id: 'cat-1', name: 'Food & Dining', icon: 'Utensils', color: '#FF9500', type: 'expense', updatedAt: Date.now() },
  { id: 'cat-2', name: 'Salary', icon: 'Banknote', color: '#30D158', type: 'income', updatedAt: Date.now() },
  { id: 'cat-3', name: 'Transfer', icon: 'ArrowLeftRight', color: '#8E8E93', type: 'transfer', updatedAt: Date.now() }
]

function renderWithProviders(ui) {
  return render(
    <ModalProvider>
      <QuickAddProvider>{ui}</QuickAddProvider>
    </ModalProvider>
  )
}

describe('Categories', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
    useAppStore.mockReturnValue({
      categories: defaultCategories.map((c) => ({ ...c })),
      addCategory: vi.fn(),
      updateCategory: vi.fn(),
      deleteCategory: vi.fn()
    })
  })

  it('shows "Categories" title', () => {
    renderWithProviders(<Categories />)
    expect(screen.getByText('Categories')).toBeInTheDocument()
  })

  it('shows "No expense categories" when categories list is empty for a type', () => {
    useAppStore.mockReturnValue({
      categories: [
        { id: 'cat-2', name: 'Salary', icon: 'Banknote', color: '#30D158', type: 'income', updatedAt: Date.now() }
      ],
      addCategory: vi.fn(),
      updateCategory: vi.fn(),
      deleteCategory: vi.fn()
    })
    renderWithProviders(<Categories />)
    expect(screen.getByText('No expense categories.')).toBeInTheDocument()
    expect(screen.getByText('No transfer categories.')).toBeInTheDocument()
  })

  it('renders categories grouped by type (expense, income, transfer)', () => {
    renderWithProviders(<Categories />)
    expect(screen.getByText('Expense')).toBeInTheDocument()
    expect(screen.getByText('Income')).toBeInTheDocument()
    expect(screen.getAllByText('Transfer').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Food & Dining')).toBeInTheDocument()
    expect(screen.getByText('Salary')).toBeInTheDocument()
  })

  it('can open the add category form', async () => {
    function Opener() {
      const action = useQuickAddAction()
      return (
        <button data-testid="opener" onClick={action}>
          Open
        </button>
      )
    }
    render(
      <ModalProvider>
        <QuickAddProvider>
          <Opener />
          <Categories />
        </QuickAddProvider>
      </ModalProvider>
    )
    await userEvent.click(screen.getByTestId('opener'))
    expect(await screen.findByText('New Category')).toBeInTheDocument()
  })

  it('renders categories with their names', () => {
    renderWithProviders(<Categories />)
    expect(screen.getByText('Food & Dining')).toBeInTheDocument()
    expect(screen.getByText('Salary')).toBeInTheDocument()
    expect(screen.getAllByText('Transfer').length).toBeGreaterThanOrEqual(1)
  })

  it('delete button shows confirm dialog', async () => {
    const originalConfirm = window.confirm
    window.confirm = vi.fn(() => false)
    renderWithProviders(<Categories />)
    const deleteButtons = screen.getAllByLabelText(/^Delete /)
    await userEvent.click(deleteButtons[0])
    expect(window.confirm).toHaveBeenCalled()
    window.confirm = originalConfirm
  })

  it('category icon picker shows available icons', async () => {
    function Opener() {
      const action = useQuickAddAction()
      return (
        <button data-testid="opener" onClick={action}>
          Open
        </button>
      )
    }
    render(
      <ModalProvider>
        <QuickAddProvider>
          <Opener />
          <Categories />
        </QuickAddProvider>
      </ModalProvider>
    )
    await userEvent.click(screen.getByTestId('opener'))
    await screen.findByText('New Category')
    expect(screen.getByRole('button', { name: 'Utensils' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Banknote' })).toBeInTheDocument()
  })
})
