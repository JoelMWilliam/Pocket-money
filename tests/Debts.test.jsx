import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Debts from '../src/components/Debts'

vi.mock('../src/store/useAppStore', () => ({
  useAppStore: vi.fn(() => ({
    debts: [
      { id: 'd1', name: 'Car Loan', principal: 1000000, balance: 750000, interestRate: 12, minimumPayment: 25000, color: '#FF375F' }
    ],
    addDebt: vi.fn(),
    updateDebt: vi.fn(),
    deleteDebt: vi.fn()
  }))
}))

describe('Debts', () => {
  it('renders total debt and payoff estimate', () => {
    render(<Debts />)
    const amounts = screen.getAllByText('LKR 750,000.00')
    expect(amounts.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/LKR 25,000.00\/mo/)).toBeInTheDocument()
  })

  it('lists the debt', () => {
    render(<Debts />)
    expect(screen.getByText('Car Loan')).toBeInTheDocument()
  })
})
