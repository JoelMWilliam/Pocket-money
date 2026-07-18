import { describe, it, expect } from 'vitest'
import { matchMerchant, autoCategorize, guessCategoryByKeywords, MERCHANT_RULES } from '../src/lib/merchantRules'

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

  it('autoCategorize falls back to keyword guess when no merchant matches', () => {
    const txn = { amount: 500, note: 'Electric bill payment', type: 'expense', date: '2026-07-15' }
    const result = autoCategorize(txn)
    expect(result.autoCategorized).toBe(true)
    expect(result.categoryId).toBe('cat-bills')
  })

  it('autoCategorize uses type-specific fallback for unknown text', () => {
    const expense = autoCategorize({ amount: 500, note: 'Xyzq unknown', type: 'expense' })
    expect(expense.categoryId).toBe('cat-other')

    const income = autoCategorize({ amount: 500, note: 'Xyzq unknown', type: 'income' })
    expect(income.categoryId).toBe('cat-salary')

    const transfer = autoCategorize({ amount: 500, note: 'Xyzq unknown', type: 'transfer' })
    expect(transfer.categoryId).toBe('cat-transfer')
  })

  it('autoCategorize handles null/empty note gracefully', () => {
    const result = autoCategorize({ amount: 500, note: null, type: 'expense' })
    expect(result).toBeDefined()
    expect(result.autoCategorized).toBe(true)
  })
})

describe('guessCategoryByKeywords', () => {
  it('returns null for empty input', () => {
    expect(guessCategoryByKeywords('', 'expense')).toBeNull()
    expect(guessCategoryByKeywords(null, 'expense')).toBeNull()
  })

  it('detects transport from taxi keyword', () => {
    const result = guessCategoryByKeywords('Paid taxi fare Rs 350')
    expect(result).toBe('cat-transport')
  })

  it('detects fuel from keyword', () => {
    const result = guessCategoryByKeywords('Shell petrol Rs 3000')
    expect(result).toBe('cat-fuel')
  })

  it('detects food from restaurant keyword', () => {
    const result = guessCategoryByKeywords('Dinner at Kottu House')
    expect(result).toBe('cat-food')
  })

  it('detects groceries', () => {
    const result = guessCategoryByKeywords('Keells supermarket LKR 2500')
    expect(result).toBe('cat-groceries')
  })

  it('detects bills from electricity', () => {
    const result = guessCategoryByKeywords('CEB electricity bill payment')
    expect(result).toBe('cat-bills')
  })

  it('detects entertainment', () => {
    const result = guessCategoryByKeywords('Movie at PVR cinemas')
    expect(result).toBe('cat-entertainment')
  })

  it('detects travel', () => {
    const result = guessCategoryByKeywords('Hotel booking Rs 5000')
    expect(result).toBe('cat-travel')
  })

  it('detects health', () => {
    const result = guessCategoryByKeywords('Pharmacy medicine Rs 200')
    expect(result).toBe('cat-health')
  })

  it('detects education', () => {
    const result = guessCategoryByKeywords('Udemy course Rs 1500')
    expect(result).toBe('cat-education')
  })

  it('detects shopping', () => {
    const result = guessCategoryByKeywords('New clothes from fashion store')
    expect(result).toBe('cat-shopping')
  })

  it('detects subscriptions', () => {
    const result = guessCategoryByKeywords('iCloud subscription')
    expect(result).toBe('cat-subscriptions')
  })

  it('detects gifts', () => {
    const result = guessCategoryByKeywords('Birthday gift bouquet')
    expect(result).toBe('cat-gifts')
  })

  it('detects donations', () => {
    const result = guessCategoryByKeywords('Temple donation Rs 100')
    expect(result).toBe('cat-donations')
  })

  it('detects personal care', () => {
    const result = guessCategoryByKeywords('Haircut at salon')
    expect(result).toBe('cat-personal')
  })

  it('detects pets', () => {
    const result = guessCategoryByKeywords('Pet food and vet checkup')
    expect(result).toBe('cat-pets')
  })

  it('detects investments', () => {
    const result = guessCategoryByKeywords('Mutual fund SIP investment')
    expect(result).toBe('cat-investments')
  })

  it('returns cat-salary for income type with no matches', () => {
    const result = guessCategoryByKeywords('Some random income', 'income')
    expect(result).toBe('cat-salary')
  })

  it('returns cat-transfer for transfer type with no matches', () => {
    const result = guessCategoryByKeywords('Some internal movement', 'transfer')
    expect(result).toBe('cat-transfer')
  })
})
