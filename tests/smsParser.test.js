import { describe, it, expect, vi } from 'vitest'
import { parseSmsTransaction, importSmsMessages } from '../src/lib/sms'

const PIN_HASH = 'pbkdf2$100000$1234567890abcdef$1234567890abcdef1234567890abcdef1234567890abcdef'

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

describe('parseSmsTransaction', () => {
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
})

describe('importSmsMessages account matching', () => {
  it('matches SMS to the account by last 4 digits', async () => {
    const { encryptAccountNumber } = await import('../src/lib/accountNumber')
    const encrypted = await encryptAccountNumber('1234567890123456', PIN_HASH)
    const transactions = []
    const store = {
      accounts: [
        { id: 'acc-default', name: 'Cash', type: 'cash' },
        { id: 'acc-1', name: 'Bank', type: 'bank', accountNumberEncrypted: encrypted }
      ],
      categories: [{ id: 'cat-food', name: 'Food', type: 'expense' }],
      addTransaction: (tx) => transactions.push(tx),
      settings: { smsImportedIds: [], smsLastImportedAt: 0 },
      updateSettings: vi.fn(),
      auth: {
        currentUser: 'tester',
        users: { tester: { pinHash: PIN_HASH } }
      }
    }
    const messages = [
      { id: '1', body: 'Debited to A/c ending 3456 for Rs.500. Avl bal Rs.1000.', date: Date.now() },
      { id: '2', body: 'Debited to A/c ending 9999 for Rs.200. Avl bal Rs.800.', date: Date.now() }
    ]
    await importSmsMessages(messages, store)
    expect(transactions.length).toBe(2)
    expect(transactions[0].accountId).toBe('acc-1')
    expect(transactions[1].accountId).toBe('acc-default')
  })
})
