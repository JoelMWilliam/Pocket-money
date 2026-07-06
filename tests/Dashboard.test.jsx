import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Dashboard from '../src/components/Dashboard'

vi.mock('../src/store/useAppStore', () => ({
  useAppStore: vi.fn(() => ({
    auth: { currentUser: 'tester', users: { tester: {} } },
    accounts: [{ id: 'acc1', name: 'Bank', balance: 50000, color: '#0A84FF', icon: 'Building2', type: 'bank' }],
    transactions: [
      { id: 'tx1', type: 'expense', amount: 1500, date: '2026-07-06', categoryId: 'cat-food', accountId: 'acc1', note: 'Lunch' },
      { id: 'tx2', type: 'income', amount: 25000, date: '2026-07-01', categoryId: 'cat-salary', accountId: 'acc1', note: 'Salary' }
    ],
    goals: [],
    budgets: [],
    categories: [
      { id: 'cat-food', name: 'Food & Dining', color: '#FF9500', type: 'expense' },
      { id: 'cat-salary', name: 'Salary', color: '#30D158', type: 'income' }
    ],
    recurring: [],
    getMonthlyTotals: () => ({ income: 25000, expense: 1500 }),
    getTotalBalance: () => 50000
  }))
}))

describe('Dashboard', () => {
  it('renders greeting and total balance', () => {
    render(<Dashboard setScreen={() => {}} />)
    expect(screen.getByText(/Good day, tester/)).toBeInTheDocument()
    expect(screen.getAllByText('LKR 50,000.00').length).toBeGreaterThanOrEqual(1)
  })

  it('displays monthly income and expense', () => {
    render(<Dashboard setScreen={() => {}} />)
    expect(screen.getByText('LKR 25,000.00')).toBeInTheDocument()
    expect(screen.getAllByText('LKR 1,500.00').length).toBeGreaterThanOrEqual(1)
  })
})
