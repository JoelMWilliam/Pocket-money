import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TransactionItem from '../src/components/TransactionItem'

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
  registerPlugin: vi.fn(() => ({}))
}))

vi.mock('@capacitor/preferences', () => ({
  Preferences: { get: vi.fn(), set: vi.fn(), remove: vi.fn(), keys: vi.fn(), clear: vi.fn() }
}))

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react')
  const mockIcons = ['MoreVertical', 'Pencil', 'Trash2', 'Tag', 'Receipt', 'Split', 'CircleDollarSign']
  const mockModule = {}
  for (const key of Object.keys(actual)) {
    mockModule[key] = mockIcons.includes(key)
      ? () => <div data-testid={`icon-${key}`} />
      : actual[key]
  }
  return mockModule
})

vi.mock('../src/lib/icons', () => ({
  getIcon: vi.fn(() => () => <div data-testid="icon-category" />)
}))

const mockAccounts = [{ id: 'acc-1', name: 'Bank Account' }]
const mockCategories = [{ id: 'cat-1', name: 'Food & Dining', color: '#FF9500', icon: 'Utensils' }]

let mockStoreState = {
  accounts: mockAccounts,
  categories: mockCategories
}

vi.mock('../src/store/useAppStore', () => ({
  useAppStore: vi.fn(() => mockStoreState)
}))

const baseTransaction = {
  id: 'tx-1',
  type: 'expense',
  amount: 1500,
  note: 'Lunch at cafe',
  date: '2026-07-06',
  categoryId: 'cat-1',
  tags: [],
  accountId: 'acc-1'
}

function renderItem(overrides = {}) {
  const mockOnClick = vi.fn()
  const mockOnDelete = vi.fn()

  const utils = render(
    <TransactionItem
      transaction={{ ...baseTransaction, ...overrides }}
      onClick={mockOnClick}
      onDelete={mockOnDelete}
    />
  )

  return { ...utils, mockOnClick, mockOnDelete }
}

describe('TransactionItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreState = { accounts: mockAccounts, categories: mockCategories }
  })

  it('renders transaction amount formatted with currency', () => {
    renderItem()
    expect(screen.getByText(/LKR/)).toBeInTheDocument()
  })

  it('renders transaction note/description', () => {
    renderItem()
    expect(screen.getByText('Lunch at cafe')).toBeInTheDocument()
  })

  it('shows positive amount with plus sign for income transactions', () => {
    renderItem({ type: 'income', amount: 5000 })
    expect(screen.getByText(/^\+ LKR 5,000\.00$/)).toBeInTheDocument()
  })

  it('shows negative amount with minus sign for expense transactions', () => {
    renderItem({ type: 'expense', amount: 1500 })
    expect(screen.getByText(/^- LKR 1,500\.00$/)).toBeInTheDocument()
  })

  it('shows transfer symbol for transfer transactions', () => {
    renderItem({ type: 'transfer', amount: 3000 })
    expect(screen.getByText(/⇄ LKR 3,000\.00$/)).toBeInTheDocument()
  })

  it('shows tags when present', () => {
    renderItem({ tags: ['food', 'lunch'] })
    expect(screen.getByText('food')).toBeInTheDocument()
    expect(screen.getByText('lunch')).toBeInTheDocument()
  })

  it('shows overflow count when more than 2 tags', () => {
    renderItem({ tags: ['a', 'b', 'c', 'd'] })
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('shows account name', () => {
    renderItem()
    expect(screen.getByText(/Bank Account/)).toBeInTheDocument()
  })

  it('shows category name when no note', () => {
    renderItem({ note: '' })
    expect(screen.getByText('Food & Dining')).toBeInTheDocument()
  })

  it('shows "Transaction" placeholder when no note or category match', () => {
    mockStoreState = { accounts: mockAccounts, categories: [] }
    render(<TransactionItem transaction={{ ...baseTransaction, note: '' }} onClick={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Transaction')).toBeInTheDocument()
  })

  it('shows "Unknown" when no account matches', () => {
    mockStoreState = { accounts: [], categories: mockCategories }
    render(<TransactionItem transaction={baseTransaction} onClick={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText(/Unknown/)).toBeInTheDocument()
  })

  it('opens context menu when more actions button is clicked', () => {
    renderItem()
    const moreButton = screen.getByLabelText('More actions')
    fireEvent.click(moreButton)
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('calls onClick when Edit is clicked from context menu', () => {
    const { mockOnClick } = renderItem()
    fireEvent.click(screen.getByLabelText('More actions'))
    fireEvent.click(screen.getByText('Edit'))
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('calls onDelete when Delete is clicked from context menu', () => {
    const { mockOnDelete } = renderItem()
    fireEvent.click(screen.getByLabelText('More actions'))
    fireEvent.click(screen.getByText('Delete'))
    expect(mockOnDelete).toHaveBeenCalledTimes(1)
  })

  it('closes context menu when clicking outside', () => {
    renderItem()
    fireEvent.click(screen.getByLabelText('More actions'))
    expect(screen.getByText('Edit')).toBeInTheDocument()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
  })

  it('calls onClick when the main row is clicked', () => {
    const { mockOnClick } = renderItem()
    const mainButton = screen.getAllByRole('button')[0]
    fireEvent.click(mainButton)
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('does not show Delete button when onDelete is not provided', () => {
    render(
      <TransactionItem
        transaction={baseTransaction}
        onClick={vi.fn()}
      />
    )
    fireEvent.click(screen.getByLabelText('More actions'))
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })
})
