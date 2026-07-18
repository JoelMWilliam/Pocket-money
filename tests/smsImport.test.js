import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
  registerPlugin: vi.fn(() => ({}))
}))

vi.mock('../src/lib/biometric', () => ({
  readNativeSms: vi.fn(() => Promise.resolve([]))
}))

vi.mock('../src/lib/banks', () => ({
  findBankBySenderId: vi.fn((s) => null),
  findBankByName: vi.fn((s) => null),
  getBankById: vi.fn((id) => null)
}))

const mockDecryptAccountNumber = vi.fn()
const mockGetLast4Digits = vi.fn((n) => (n ? String(n).slice(-4) : null))
const mockGetFirst4Digits = vi.fn((n) => (n ? String(n).slice(0, 4) : null))

vi.mock('../src/lib/accountNumber', () => ({
  decryptAccountNumber: (...args) => mockDecryptAccountNumber(...args),
  getLast4Digits: (...args) => mockGetLast4Digits(...args),
  getFirst4Digits: (...args) => mockGetFirst4Digits(...args)
}))

const PIN_HASH = 'pbkdf2$100000$1234567890abcdef$1234567890abcdef1234567890abcdef1234567890abcdef'

describe('isTransactionSms', () => {
  it('accepts valid debit transaction SMS', async () => {
    const { isTransactionSms } = await import('../src/lib/sms')
    expect(isTransactionSms('Your A/c XX1234 debited with Rs.1,500.00')).toBe(true)
  })

  it('accepts valid credit transaction SMS', async () => {
    const { isTransactionSms } = await import('../src/lib/sms')
    expect(isTransactionSms('Your account has been credited with LKR 25,000.00')).toBe(true)
  })

  it('rejects promotional SMS with cashback offers', async () => {
    const { isTransactionSms } = await import('../src/lib/sms')
    expect(isTransactionSms('Get Rs.500 cashback on your next purchase! Offer valid till 31-Jul.')).toBe(false)
  })

  it('rejects lottery / win messages', async () => {
    const { isTransactionSms } = await import('../src/lib/sms')
    expect(isTransactionSms('Congratulations! You have won Rs.10,000. Call now.')).toBe(false)
  })

  it('rejects generic marketing without bank alert keyword', async () => {
    const { isTransactionSms } = await import('../src/lib/sms')
    expect(isTransactionSms('Shop now and save up to Rs.2,000. Download our app today.')).toBe(false)
  })

  it('rejects loan approval messages', async () => {
    const { isTransactionSms } = await import('../src/lib/sms')
    expect(isTransactionSms('Your loan of Rs.100,000 is pre-approved. Apply now.')).toBe(false)
  })

  it('rejects declined/failed transaction SMS (false positive)', async () => {
    const { isTransactionSms } = await import('../src/lib/sms')
    expect(isTransactionSms('Your transaction of Rs.500 has been declined due to insufficient funds.')).toBe(false)
  })

  it('rejects OTP/verification SMS (false positive)', async () => {
    const { isTransactionSms } = await import('../src/lib/sms')
    expect(isTransactionSms('Your OTP for transaction is 123456. Valid for 5 minutes.')).toBe(false)
  })

  it('does not reject debit sms that mentions available balance', async () => {
    const { isTransactionSms } = await import('../src/lib/sms')
    expect(isTransactionSms('Your A/c XX1234 debited with Rs.1,500.00 on 12-Jul. Available balance Rs.45,000.')).toBe(true)
  })
})

describe('parseSmsTransaction', () => {
  it('parses a debit transaction with amount', async () => {
    const { parseSmsTransaction } = await import('../src/lib/sms')
    const tx = parseSmsTransaction('Your A/c XX1234 debited with Rs.1,500.00 on 12-Jul. Available balance Rs.45,000.')
    expect(tx).not.toBeNull()
    expect(tx.amount).toBe(1500)
    expect(tx.type).toBe('expense')
  })

  it('parses a credit transaction', async () => {
    const { parseSmsTransaction } = await import('../src/lib/sms')
    const tx = parseSmsTransaction('Your account XX1234 has been credited with LKR 25,000.00 on 12-Jul.')
    expect(tx).not.toBeNull()
    expect(tx.amount).toBe(25000)
    expect(tx.type).toBe('income')
  })

  it('parses UPI transaction alerts', async () => {
    const { parseSmsTransaction } = await import('../src/lib/sms')
    const tx = parseSmsTransaction('UPI transaction of Rs.350 credited to ABC Store from your account XX1234.')
    expect(tx).not.toBeNull()
    expect(tx.amount).toBe(350)
    expect(tx.type).toBe('income')
  })

  it('parses ATM withdrawal', async () => {
    const { parseSmsTransaction } = await import('../src/lib/sms')
    const tx = parseSmsTransaction('ATM withdrawal of Rs.5,000 from A/c XX1234. Available balance Rs.30,000.')
    expect(tx).not.toBeNull()
    expect(tx.amount).toBe(5000)
    expect(tx.type).toBe('expense')
  })

  it('returns null for promotional SMS', async () => {
    const { parseSmsTransaction } = await import('../src/lib/sms')
    expect(parseSmsTransaction('Get Rs.500 cashback on your next purchase!')).toBeNull()
  })

  it('returns null for declined transactions', async () => {
    const { parseSmsTransaction } = await import('../src/lib/sms')
    expect(parseSmsTransaction('Your transaction of Rs.500 has been declined.')).toBeNull()
  })
})

describe('importSmsMessages account matching', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDecryptAccountNumber.mockResolvedValue('1234567890123456')
  })

  it('matches SMS to the correct account by last 4 digits', async () => {
    const { importSmsMessages } = await import('../src/lib/sms')
    mockGetLast4Digits.mockImplementation((n) => (n ? String(n).slice(-4) : null))
    const transactions = []
    const store = {
      accounts: [
        { id: 'acc-default', name: 'Cash', type: 'cash' },
        { id: 'acc-1', name: 'Bank', type: 'bank', accountNumberEncrypted: 'enc1', bankId: 'commercial-bank' }
      ],
      categories: [{ id: 'cat-food', name: 'Food', type: 'expense' }],
      addTransaction: (tx) => transactions.push(tx),
      settings: { smsImportedIds: [], smsLastImportedAt: 0 },
      updateSettings: vi.fn(),
      auth: { currentUser: 'tester', users: { tester: { pinHash: PIN_HASH } } },
      transactions: []
    }
    const messages = [
      { id: '1', body: 'Debited to A/c ending 3456 for Rs.500. Avl bal Rs.1000.', date: Date.now() },
      { id: '2', body: 'Debited to A/c ending 9999 for Rs.200. Avl bal Rs.800.', date: Date.now() }
    ]
    const result = await importSmsMessages(messages, store)
    expect(transactions.length).toBe(1)
    expect(transactions[0].accountId).toBe('acc-1')
    expect(result.unmatched.length).toBe(1)
    expect(result.unmatched[0].messageId).toBe('2')
  })

  it('returns unmatched transactions instead of defaulting', async () => {
    const { importSmsMessages } = await import('../src/lib/sms')
    mockDecryptAccountNumber.mockResolvedValue('1234567890123456')
    const transactions = []
    const store = {
      accounts: [{ id: 'acc-1', name: 'ComBank Savings', type: 'bank', accountNumberEncrypted: 'enc1' }],
      categories: [{ id: 'cat-food', name: 'Food', type: 'expense' }],
      addTransaction: (tx) => transactions.push(tx),
      settings: { smsImportedIds: [], smsLastImportedAt: 0 },
      updateSettings: vi.fn(),
      auth: { currentUser: 'tester', users: { tester: { pinHash: PIN_HASH } } },
      transactions: []
    }
    const result = await importSmsMessages(
      [{ id: '1', body: 'Alert from UnKnownBank: Rs.500 debited from your account.', date: Date.now() }],
      store
    )
    expect(transactions.length).toBe(0)
    expect(result.unmatched.length).toBeGreaterThan(0)
  })

  it('detects duplicates', async () => {
    const { importSmsMessages } = await import('../src/lib/sms')
    const store = {
      accounts: [{ id: 'acc-1', name: 'Cash', type: 'cash' }],
      categories: [{ id: 'cat-food', name: 'Food', type: 'expense' }],
      addTransaction: vi.fn(),
      settings: { smsImportedIds: ['existing-id'], smsLastImportedAt: 0 },
      updateSettings: vi.fn(),
      auth: { currentUser: 'tester', users: { tester: { pinHash: PIN_HASH } } },
      transactions: [
        { amount: 500, type: 'expense', date: new Date().toISOString().slice(0, 10), note: 'Uber' }
      ]
    }
    const result = await importSmsMessages(
      [{ id: 'existing-id', body: 'Debited Rs.500 to Uber. Avl bal Rs.1000.', date: Date.now() }],
      store
    )
    expect(result.duplicates.length).toBeGreaterThan(0)
  })

  it('returns error when no accounts exist', async () => {
    const { importSmsMessages } = await import('../src/lib/sms')
    const result = await importSmsMessages(
      [{ id: '1', body: 'Debited Rs.500. Avl bal Rs.1000.', date: Date.now() }],
      { accounts: [], addTransaction: vi.fn(), settings: { smsImportedIds: [], smsLastImportedAt: 0 }, updateSettings: vi.fn(), auth: { currentUser: null, users: {} }, transactions: [] }
    )
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe('importSingleSmsMessage', () => {
  it('returns descriptive error for parse failure', async () => {
    const { importSingleSmsMessage } = await import('../src/lib/sms')
    const result = await importSingleSmsMessage(
      { id: '1', body: 'Hello from your friend!', date: Date.now() },
      { accounts: [{ id: 'acc-1', name: 'Cash', type: 'cash' }], transactions: [], addTransaction: vi.fn(), settings: { smsImportedIds: [], smsLastImportedAt: 0 }, updateSettings: vi.fn(), auth: { currentUser: 'tester', users: { tester: { pinHash: PIN_HASH } } } }
    )
    expect(result.success).toBe(false)
    expect(result.reason).toBeTruthy()
    expect(result.message).toBeTruthy()
  })
})

describe('isDeclinedTransaction / isBalanceInfoSms', () => {
  it('detects declined transaction SMS', async () => {
    const { isDeclinedTransaction, isBalanceInfoSms } = await import('../src/lib/sms')
    expect(isDeclinedTransaction('Your transaction has been declined.')).toBe(true)
    expect(isDeclinedTransaction('Payment failed due to insufficient funds.')).toBe(true)
  })

  it('detects balance info SMS', async () => {
    const { isBalanceInfoSms } = await import('../src/lib/sms')
    expect(isBalanceInfoSms('Your OTP for login is 123456.')).toBe(true)
  })
})

describe('reimportUnmatchedSms', () => {
  it('returns stillUnmatched for messages that cannot be matched', async () => {
    const { reimportUnmatchedSms } = await import('../src/lib/sms')
    const result = await reimportUnmatchedSms(
      [{ id: '1', body: 'Unknown Bank Alert: Rs.500 debited.', date: Date.now() }],
      { accounts: [{ id: 'acc-1', name: 'Cash', type: 'cash' }], transactions: [], addTransaction: vi.fn(), settings: { smsImportedIds: [], smsLastImportedAt: 0 }, updateSettings: vi.fn(), auth: { currentUser: 'tester', users: { tester: { pinHash: PIN_HASH } } } }
    )
    expect(Array.isArray(result.stillUnmatched)).toBe(true)
  })
})
