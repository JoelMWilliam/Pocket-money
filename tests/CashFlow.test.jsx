import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CashFlow from '../src/components/CashFlow'

vi.mock('../src/store/useAppStore', () => ({
  useAppStore: vi.fn(() => ({
    accounts: [{ id: 'acc1', balance: 10000 }],
    transactions: [],
    recurring: [
      { id: 'r1', name: 'Rent', amount: 5000, type: 'expense', frequency: 'monthly', nextDueDate: new Date().toISOString().slice(0, 10), active: true }
    ]
  }))
}))

describe('CashFlow', () => {
  it('renders projected balance header', () => {
    render(<CashFlow setScreen={() => {}} />)
    expect(screen.getByText(/Projected Balance \(60 days\)/)).toBeInTheDocument()
  })

  it('shows upcoming expense amount', () => {
    render(<CashFlow setScreen={() => {}} />)
    expect(screen.getAllByText('-LKR 5,000.00').length).toBeGreaterThanOrEqual(1)
  })
})
