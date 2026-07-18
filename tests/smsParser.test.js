import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
  registerPlugin: vi.fn(() => ({}))
}))

vi.mock('../src/lib/biometric', () => ({
  readNativeSms: vi.fn(() => Promise.resolve([]))
}))

vi.mock('../src/lib/notifications', () => ({
  ...vi.importActual('../src/lib/notifications'),
  scheduleBudgetAlert: vi.fn(() => Promise.resolve(false)),
  cancelBudgetAlert: vi.fn(() => Promise.resolve())
}))

vi.mock('../src/lib/banks', () => ({
  findBankBySenderId: vi.fn(() => null),
  findBankByName: vi.fn(() => null),
  getBankById: vi.fn(() => null)
}))

const mockDecryptAccountNumber = vi.fn()
const mockGetLast4Digits = vi.fn((n) => (n ? String(n).slice(-4) : null))
const mockGetFirst4Digits = vi.fn((n) => (n ? String(n).slice(0, 4) : null))

vi.mock('../src/lib/accountNumber', () => ({
  decryptAccountNumber: (...args) => mockDecryptAccountNumber(...args),
  getLast4Digits: (...args) => mockGetLast4Digits(...args),
  getFirst4Digits: (...args) => mockGetFirst4Digits(...args)
}))

describe('parseSmsTransaction', () => {
  let parseSmsTransaction
  beforeAll(async () => {
    const mod = await import('../src/lib/sms')
    parseSmsTransaction = mod.parseSmsTransaction
  })

  it('parses a debit transaction', () => {
    const body = 'Your A/c XX1234 debited with Rs.1,500.00 on 12-Jul. Available balance Rs.45,000.'
    const tx = parseSmsTransaction(body)
    expect(tx).not.toBeNull()
    expect(tx.amount).toBe(1500)
    expect(tx.type).toBe('expense')
  })

  it('parses a credit transaction', () => {
    const body = 'Your account XX1234 has been credited with LKR 25,000.00 on 12-Jul.'
    const tx = parseSmsTransaction(body)
    expect(tx).not.toBeNull()
    expect(tx.amount).toBe(25000)
    expect(tx.type).toBe('income')
  })

  it('ignores promotional offers with amounts', () => {
    const body = 'Get Rs.500 cashback on your next purchase! Offer valid till 31-Jul. Click here.'
    expect(parseSmsTransaction(body)).toBeNull()
  })

  it('ignores lottery / win messages', () => {
    const body = 'Congratulations! You have won Rs.10,000. Call now to claim your prize.'
    expect(parseSmsTransaction(body)).toBeNull()
  })

  it('ignores generic marketing with no bank alert keyword', () => {
    const body = 'Shop now and save up to Rs.2,000. Download our app today.'
    expect(parseSmsTransaction(body)).toBeNull()
  })

  it('ignores loan approval messages', () => {
    const body = 'Your loan of Rs.100,000 is pre-approved. Apply now and get instant disbursement.'
    expect(parseSmsTransaction(body)).toBeNull()
  })

  it('parses UPI transaction alerts', () => {
    const body = 'UPI transaction of Rs.350 credited to ABC Store from your account XX1234.'
    const tx = parseSmsTransaction(body)
    expect(tx).not.toBeNull()
    expect(tx.amount).toBe(350)
    expect(tx.type).toBe('income')
  })

  it('parses ATM withdrawal', () => {
    const body = 'ATM withdrawal of Rs.5,000 from A/c XX1234. Available balance Rs.30,000.'
    const tx = parseSmsTransaction(body)
    expect(tx).not.toBeNull()
    expect(tx.amount).toBe(5000)
    expect(tx.type).toBe('expense')
  })

  it('ignores declined transactions', () => {
    const body = 'Your transaction of Rs.500 has been declined due to insufficient funds.'
    expect(parseSmsTransaction(body)).toBeNull()
  })

  it('ignores balance enquiry only SMS', () => {
    const body = 'Your OTP for login is 123456. Valid for 5 mins.'
    expect(parseSmsTransaction(body)).toBeNull()
  })
})
