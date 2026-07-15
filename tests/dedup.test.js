import { describe, it, expect } from 'vitest'
import {
  generateTransactionFingerprint,
  areTransactionsSimilar,
  findDuplicates,
  deduplicateTransactions
} from '../src/lib/dedup'

describe('Deduplication Engine', () => {
  it('generates same fingerprint for identical transactions', () => {
    const a = { amount: 1000, date: '2026-07-15', note: 'Uber ride' }
    const b = { amount: 1000, date: '2026-07-15', note: 'Uber ride' }
    expect(generateTransactionFingerprint(a)).toBe(generateTransactionFingerprint(b))
  })

  it('generates different fingerprint for different amounts', () => {
    const a = { amount: 1000, date: '2026-07-15', note: 'Uber' }
    const b = { amount: 2000, date: '2026-07-15', note: 'Uber' }
    expect(generateTransactionFingerprint(a)).not.toBe(generateTransactionFingerprint(b))
  })

  it('detects similar transactions within amount tolerance', () => {
    const a = { amount: 1000, date: '2026-07-15', note: 'Uber ride' }
    const b = { amount: 1010, date: '2026-07-15', note: 'Uber ride' }
    expect(areTransactionsSimilar(a, b)).toBe(true)
  })

  it('rejects transactions with different amounts', () => {
    const a = { amount: 1000, date: '2026-07-15', note: 'Uber' }
    const b = { amount: 5000, date: '2026-07-15', note: 'Uber' }
    expect(areTransactionsSimilar(a, b)).toBe(false)
  })

  it('rejects transactions too far apart in date', () => {
    const a = { amount: 1000, date: '2026-07-15', note: 'Uber' }
    const b = { amount: 1000, date: '2026-08-15', note: 'Uber' }
    expect(areTransactionsSimilar(a, b)).toBe(false)
  })

  it('finds duplicates in existing list', () => {
    const existing = [
      { amount: 1000, date: '2026-07-15', note: 'Uber ride', source: 'sms' }
    ]
    const newTxn = { amount: 1000, date: '2026-07-15', note: 'Uber ride', source: 'email' }
    const dups = findDuplicates(newTxn, existing)
    expect(dups.length).toBe(1)
  })

  it('returns no duplicates when list is empty', () => {
    const dups = findDuplicates({ amount: 1000, date: '2026-07-15', note: 'Test' }, [])
    expect(dups.length).toBe(0)
  })

  it('deduplicates batch correctly', () => {
    const existing = [
      { id: 't1', amount: 1000, date: '2026-07-15', note: 'Uber ride', source: 'sms' }
    ]
    const newTxns = [
      { amount: 1000, date: '2026-07-15', note: 'Uber ride', source: 'email' },
      { amount: 2500, date: '2026-07-15', note: 'Swiggy order', source: 'email' }
    ]
    const { unique, duplicates } = deduplicateTransactions(newTxns, existing)
    expect(unique.length).toBe(1)
    expect(duplicates).toBe(1)
    expect(unique[0].note).toBe('Swiggy order')
  })

  it('deduplicates internal duplicates within batch', () => {
    const newTxns = [
      { amount: 1000, date: '2026-07-15', note: 'Uber ride' },
      { amount: 1000, date: '2026-07-15', note: 'Uber ride' },
      { amount: 1000, date: '2026-07-15', note: 'Uber ride' }
    ]
    const { unique, duplicates } = deduplicateTransactions(newTxns, [])
    expect(unique.length).toBe(1)
    expect(duplicates).toBeGreaterThanOrEqual(1)
  })
})
