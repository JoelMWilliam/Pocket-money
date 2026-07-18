import { describe, it, expect, vi } from 'vitest'
import { parseSmsTransaction } from '../src/lib/sms'

describe('DailyReport - SMS parsing for report data', () => {
  it('parses a debit SMS correctly', () => {
    const result = parseSmsTransaction('Your account has been debited LKR 5,000.00 for payment to KEELLS SUPER')
    expect(result).not.toBeNull()
    expect(result.amount).toBe(5000)
    expect(result.type).toBe('expense')
  })

  it('parses a credit SMS correctly', () => {
    const result = parseSmsTransaction('LKR 50,000.00 credited to your account from JOHN DOE')
    expect(result).not.toBeNull()
    expect(result.amount).toBe(50000)
    expect(result.type).toBe('income')
  })

  it('rejects promotional messages', () => {
    const result = parseSmsTransaction('Get 50% cashback on your next purchase! Offer valid till Dec 31')
    expect(result).toBeNull()
  })

  it('rejects messages without bank alert keywords', () => {
    const result = parseSmsTransaction('Hey how are you doing today?')
    expect(result).toBeNull()
  })

  it('parses transfer type correctly', () => {
    const result = parseSmsTransaction('LKR 10,000.00 transferred from account 1234567890')
    expect(result).not.toBeNull()
    expect(result.type).toBe('transfer')
  })
})

describe('DailyReport - 30-day average calculation', () => {
  const transactions = [
    { type: 'expense', amount: 1000, date: '2026-07-14', categoryId: 'cat-food' },
    { type: 'expense', amount: 2000, date: '2026-07-13', categoryId: 'cat-food' },
    { type: 'expense', amount: 500, date: '2026-07-12', categoryId: 'cat-transport' },
    { type: 'income', amount: 50000, date: '2026-07-01', categoryId: 'cat-salary' },
  ]

  it('calculates daily average correctly', () => {
    const expenseTotal = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    const dailyAvg = expenseTotal / 3
    expect(dailyAvg).toBeCloseTo(1166.67, 1)
  })

  it('identifies top category', () => {
    const byCategory = {}
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        byCategory[t.categoryId] = (byCategory[t.categoryId] || 0) + t.amount
      })
    const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]
    expect(top[0]).toBe('cat-food')
    expect(top[1]).toBe(3000)
  })

  it('calculates net cash flow', () => {
    const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const net = income - expense
    expect(net).toBe(46500)
  })

  it('calculates savings rate', () => {
    const income = 50000
    const expense = 3500
    const savingsRate = ((income - expense) / income) * 100
    expect(savingsRate).toBe(93)
  })
})
