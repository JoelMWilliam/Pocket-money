import { describe, it, expect } from 'vitest'
import {
  encryptAccountNumber,
  decryptAccountNumber,
  getLast4Digits,
  getFirst4Digits,
  extractAccountHint,
  maskAccountNumber
} from '../src/lib/accountNumber'

const PIN_HASH = 'pbkdf2$100000$1234567890abcdef$1234567890abcdef1234567890abcdef1234567890abcdef'

describe('accountNumber encryption', () => {
  it('encrypts and decrypts a card number', async () => {
    const number = '1234567890123456'
    const encrypted = await encryptAccountNumber(number, PIN_HASH)
    expect(encrypted).toHaveProperty('salt')
    expect(encrypted).toHaveProperty('iv')
    expect(encrypted).toHaveProperty('data')
    const decrypted = await decryptAccountNumber(encrypted, PIN_HASH)
    expect(decrypted).toBe(number)
  })

  it('returns null for empty input', async () => {
    expect(await encryptAccountNumber('', PIN_HASH)).toBeNull()
    expect(await encryptAccountNumber('   ', PIN_HASH)).toBeNull()
  })

  it('returns null when pinHash is missing', async () => {
    expect(await encryptAccountNumber('1234', null)).toBeNull()
  })

  it('strips spaces before encrypting', async () => {
    const encrypted = await encryptAccountNumber('1234 5678 9012 3456', PIN_HASH)
    const decrypted = await decryptAccountNumber(encrypted, PIN_HASH)
    expect(decrypted).toBe('1234567890123456')
  })
})

describe('accountNumber helpers', () => {
  it('extracts last 4 digits', () => {
    expect(getLast4Digits('1234567890123456')).toBe('3456')
    expect(getLast4Digits('1234')).toBe('1234')
    expect(getLast4Digits('abc')).toBeNull()
  })

  it('extracts first 4 digits', () => {
    expect(getFirst4Digits('1234567890123456')).toBe('1234')
    expect(getFirst4Digits('12')).toBeNull()
  })

  it('masks a number showing only last 4 digits', () => {
    expect(maskAccountNumber('1234567890123456')).toBe('••••••••••••3456')
    expect(maskAccountNumber('1234')).toBe('••••')
  })

  it('extracts account hint from SMS bodies', () => {
    expect(extractAccountHint('Debited to A/c XX1234 for Rs.500')).toBe('1234')
    expect(extractAccountHint('Card ending 9876 used for Rs.200')).toBe('9876')
    expect(extractAccountHint('Credited to account *1234 LKR 1000')).toBe('1234')
    expect(extractAccountHint('No hint here')).toBeNull()
  })
})
