import { describe, it, expect } from 'vitest'
import { matchMerchant, autoCategorize, MERCHANT_RULES } from '../src/lib/merchantRules'

describe('Merchant Rules', () => {
  it('matches Uber correctly', () => {
    const result = matchMerchant('Paid to Uber Rs 250')
    expect(result).not.toBeNull()
    expect(result.merchant).toBe('Uber')
    expect(result.categoryId).toBe('cat-transport')
  })

  it('matches Swiggy as food', () => {
    const result = matchMerchant('Swiggy order LKR 1200')
    expect(result).not.toBeNull()
    expect(result.merchant).toBe('Swiggy')
    expect(result.categoryId).toBe('cat-food')
  })

  it('matches Amazon as shopping', () => {
    const result = matchMerchant('AMZN order confirmed')
    expect(result).not.toBeNull()
    expect(result.merchant).toBe('Amazon')
    expect(result.categoryId).toBe('cat-shopping')
  })

  it('matches Netflix as entertainment/subscription', () => {
    const result = matchMerchant('Netflix monthly subscription')
    expect(result).not.toBeNull()
    expect(result.merchant).toBe('Netflix')
  })

  it('matches salary as income', () => {
    const result = matchMerchant('Salary credited for July 2026')
    expect(result).not.toBeNull()
    expect(result.type).toBe('income')
  })

  it('matches fuel station', () => {
    const result = matchMerchant('Shell fuel payment LKR 5000')
    expect(result).not.toBeNull()
    expect(result.merchant).toBe('Fuel Station')
    expect(result.categoryId).toBe('cat-fuel')
  })

  it('matches insurance', () => {
    const result = matchMerchant('Allianz insurance premium')
    expect(result).not.toBeNull()
    expect(result.merchant).toBe('Insurance')
  })

  it('matches transfer for UPI/NEFT', () => {
    const result = matchMerchant('UPI transfer to friend')
    expect(result).not.toBeNull()
    expect(result.type).toBe('transfer')
  })

  it('returns null for unknown merchant', () => {
    const result = matchMerchant('Payment for some random thing')
    expect(result).toBeNull()
  })

  it('returns null for empty text', () => {
    const result = matchMerchant('')
    expect(result).toBeNull()
  })

  it('returns null for null input', () => {
    const result = matchMerchant(null)
    expect(result).toBeNull()
  })

  it('has at least 50 rules', () => {
    expect(MERCHANT_RULES.length).toBeGreaterThanOrEqual(50)
  })

  it('autoCategorize adds merchant and categoryId', () => {
    const txn = { amount: 500, note: 'Uber ride', type: 'expense', date: '2026-07-15' }
    const result = autoCategorize(txn)
    expect(result.merchant).toBe('Uber')
    expect(result.categoryId).toBe('cat-transport')
    expect(result.autoCategorized).toBe(true)
  })

  it('autoCategorize returns original if no match', () => {
    const txn = { amount: 500, note: 'Random place', type: 'expense', date: '2026-07-15' }
    const result = autoCategorize(txn)
    expect(result.categoryId).toBeUndefined()
    expect(result.autoCategorized).toBeUndefined()
  })
})
