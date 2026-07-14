import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Budgets from '../src/components/Budgets'

vi.mock('../src/store/useAppStore', () => ({
  useAppStore: vi.fn(() => ({
    budgets: [
      { id: 'b1', categoryId: 'cat-food', amount: 10000, rollover: false, rolloverAmount: 0 }
    ],
    categories: [
      { id: 'cat-food', name: 'Food & Dining', color: '#FF9500', icon: 'Utensils', type: 'expense' }
    ],
    transactions: [
      { id: 'tx1', type: 'expense', amount: 4000, date: '2026-07-05', categoryId: 'cat-food' }
    ],
    addBudget: vi.fn(),
    updateBudget: vi.fn(),
    deleteBudget: vi.fn(),
    getBudgetProgress: (id) => {
      if (id === 'b1') return { spent: 4000, limit: 10000, rolloverAmount: 0, percent: 40 }
      return { spent: 0, limit: 0, rolloverAmount: 0, percent: 0 }
    }
  }))
}))

describe('Budgets', () => {
  it('shows budget category and progress', () => {
    render(<Budgets />)
    expect(screen.getByText('Food & Dining')).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
  })
})
