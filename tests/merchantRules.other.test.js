import { describe, it, expect, beforeEach } from 'vitest'
import { autoCategorize, learnMerchantCategory, LEARNED_MERCHANTS } from '../src/lib/merchantRules'

describe('Categorization Other fallback', () => {
  beforeEach(() => {
    LEARNED_MERCHANTS.clear()
  })

  it('Unknown expense transaction gets category cat-other', () => {
    const result = autoCategorize({ amount: 500, note: 'Xyzq unknown', type: 'expense' })
    expect(result.categoryId).toBe('cat-other')
  })

  it('Unknown expense transaction gets needsReview true', () => {
    const result = autoCategorize({ amount: 500, note: 'Xyzq unknown', type: 'expense' })
    expect(result.needsReview).toBe(true)
  })

  it('Unknown income transaction still gets cat-salary', () => {
    const result = autoCategorize({ amount: 500, note: 'Xyzq unknown', type: 'income' })
    expect(result.categoryId).toBe('cat-salary')
  })

  it('Unknown transfer still gets cat-transfer', () => {
    const result = autoCategorize({ amount: 500, note: 'Xyzq unknown', type: 'transfer' })
    expect(result.categoryId).toBe('cat-transfer')
  })

  it('learnMerchantCategory stores a mapping', () => {
    learnMerchantCategory('Acme Corp', 'cat-shopping')
    expect(LEARNED_MERCHANTS.get('acme corp')).toBe('cat-shopping')
  })

  it('After learning, autoCategorize returns the learned category for the same merchant', () => {
    learnMerchantCategory('Coffee Bean', 'cat-food')
    const result = autoCategorize({ amount: 500, note: 'Coffee Bean', type: 'expense' })
    expect(result.categoryId).toBe('cat-food')
  })

  it('learnMerchantCategory is case-insensitive and punctuation-insensitive', () => {
    learnMerchantCategory('Acme Corp.', 'cat-shopping')
    const result = autoCategorize({ amount: 500, merchant: 'acme corp', type: 'expense' })
    expect(result.categoryId).toBe('cat-shopping')
  })

  it('Merchant rules still take precedence over learned mappings', () => {
    learnMerchantCategory('Uber', 'cat-food')
    const result = autoCategorize({ amount: 500, note: 'Uber ride', type: 'expense' })
    expect(result.categoryId).toBe('cat-transport')
  })

  it('Keyword fallback takes precedence over Other if keywords match', () => {
    const result = autoCategorize({ amount: 500, note: 'Electric bill payment', type: 'expense' })
    expect(result.categoryId).toBe('cat-bills')
  })
})
