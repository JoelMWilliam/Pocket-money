import { describe, it, expect, vi } from 'vitest'

const {
  mockDecryptAccountNumber,
  mockGetLast4Digits,
  mockGetFirst4Digits,
  mockFindBankBySenderId,
  mockFindBankByName
} = vi.hoisted(() => ({
  mockDecryptAccountNumber: vi.fn(),
  mockGetLast4Digits: vi.fn((n) => n ? n.slice(-4) : null),
  mockGetFirst4Digits: vi.fn((n) => n ? n.slice(0, 4) : null),
  mockFindBankBySenderId: vi.fn(),
  mockFindBankByName: vi.fn()
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
  registerPlugin: vi.fn(() => ({}))
}))

vi.mock('../src/lib/accountNumber', () => ({
  decryptAccountNumber: (...args) => mockDecryptAccountNumber(...args),
  getLast4Digits: (...args) => mockGetLast4Digits(...args),
  getFirst4Digits: (...args) => mockGetFirst4Digits(...args)
}))

vi.mock('../src/lib/banks', () => ({
  findBankBySenderId: (...args) => mockFindBankBySenderId(...args),
  findBankByName: (...args) => mockFindBankByName(...args)
}))

const { extractAccountFragment, buildAccountHints, matchSmsToAccount, getAccountMatchReason } = await import('../src/lib/accountMatcher')

beforeEach(() => {
  vi.clearAllMocks()
  mockDecryptAccountNumber.mockReset()
  mockGetLast4Digits.mockImplementation((n) => n ? n.slice(-4) : null)
  mockGetFirst4Digits.mockImplementation((n) => n ? n.slice(0, 4) : null)
  mockFindBankBySenderId.mockReset()
  mockFindBankByName.mockReset()
})

describe('extractAccountFragment', () => {
  it('extracts 1234 from ending 1234', () => {
    expect(extractAccountFragment('Card ending 1234 used')).toBe('1234')
  })

  it('extracts 3456 from a/c XX3456', () => {
    expect(extractAccountFragment('Debited to a/c XX3456')).toBe('3456')
  })
})

describe('buildAccountHints', () => {
  it('returns decrypted last4/first4 for encrypted accounts', async () => {
    mockDecryptAccountNumber.mockResolvedValue('1234567890123456')
    const accounts = [{ id: 'a1', bankId: 'bank-a', accountNumberEncrypted: 'encrypted' }]
    const hints = await buildAccountHints(accounts, 'pin')

    expect(hints).toEqual([{ id: 'a1', bankId: 'bank-a', last4: '3456', first4: '1234', name: '' }])
    expect(mockDecryptAccountNumber).toHaveBeenCalledWith('encrypted', 'pin')
  })

  it('returns nulls for unencrypted accounts', async () => {
    const accounts = [{ id: 'a2', bankId: 'bank-b' }]
    const hints = await buildAccountHints(accounts, 'pin')

    expect(hints).toEqual([{ id: 'a2', bankId: 'bank-b', last4: null, first4: null, name: '' }])
    expect(mockDecryptAccountNumber).not.toHaveBeenCalled()
  })
})

describe('matchSmsToAccount', () => {
  const accounts = [
    { id: 'acc-1', bankId: 'bank-a', accountNumberEncrypted: 'enc1' },
    { id: 'acc-2', bankId: 'bank-b', accountNumberEncrypted: 'enc2' },
    { id: 'acc-3', bankId: 'bank-a', accountNumberEncrypted: 'enc3' }
  ]

  beforeEach(() => {
    mockDecryptAccountNumber.mockImplementation(async (enc) => {
      if (enc === 'enc1') return '1234567890111111'
      if (enc === 'enc2') return '5678901222222222'
      if (enc === 'enc3') return '9012345678333333'
      return null
    })
  })

  it('matches by fragment with high confidence', async () => {
    mockFindBankBySenderId.mockReturnValue(null)
    mockFindBankByName.mockReturnValue(null)

    const sms = { body: 'Debited to a/c XX1111', address: 'BANK-A' }
    const result = await matchSmsToAccount(sms, accounts, { pinHash: 'pin' })

    expect(result.matched).toBe(true)
    expect(result.accountId).toBe('acc-1')
    expect(result.confidence).toBe('high')
    expect(result.matchType).toBe('fragment')
    expect(result.reason).toBe('account-fragment-matched')
  })

  it('matches by sender ID with medium confidence when exactly one account has that bank', async () => {
    mockFindBankBySenderId.mockReturnValue({ id: 'bank-b', name: 'Bank B' })

    const sms = { body: 'Payment made Rs.500', address: 'BANK-B' }
    const result = await matchSmsToAccount(sms, [accounts[0], accounts[1]], { pinHash: 'pin' })

    expect(result.matched).toBe(true)
    expect(result.accountId).toBe('acc-2')
    expect(result.confidence).toBe('medium')
    expect(result.matchType).toBe('sender')
    expect(result.reason).toBe('sender-bank-single-account')
  })

  it('falls back to sender ID match when fragment does not match any account', async () => {
    mockFindBankBySenderId.mockReturnValue({ id: 'bank-a', name: 'Bank A' })

    const sms = { body: 'Debited to a/c XX9999', address: 'BANK-A' }
    const result = await matchSmsToAccount(sms, accounts.slice(0, 2), { pinHash: 'pin' })

    expect(result.matched).toBe(true)
    expect(result.accountId).toBe('acc-1')
    expect(result.confidence).toBe('medium')
    expect(result.matchType).toBe('sender')
    expect(result.reason).toBe('sender-bank-single-account')
  })

  it('returns unmatched/ambiguous when multiple accounts have same bank and no fragment', async () => {
    mockFindBankBySenderId.mockReturnValue({ id: 'bank-a', name: 'Bank A' })

    const sms = { body: 'Payment made Rs.500', address: 'BANK-A' }
    const result = await matchSmsToAccount(sms, [accounts[0], accounts[2]], { pinHash: 'pin' })

    expect(result.matched).toBe(false)
    expect(result.accountId).toBeNull()
    expect(result.confidence).toBe('low')
    expect(result.matchType).toBe('none')
    expect(result.reason).toBe('ambiguous-bank-multiple-accounts')
    expect(result.candidates).toContain('acc-1')
    expect(result.candidates).toContain('acc-3')
  })

  it('prefers fragment match over sender match when fragment points to a different bank', async () => {
    mockFindBankBySenderId.mockReturnValue({ id: 'bank-a', name: 'Bank A' })

    const sms = { body: 'Debited to a/c XX2222', address: 'BANK-A' }
    const result = await matchSmsToAccount(sms, accounts.slice(0, 2), { pinHash: 'pin' })

    expect(result.matched).toBe(true)
    expect(result.accountId).toBe('acc-2')
    expect(result.confidence).toBe('high')
    expect(result.matchType).toBe('fragment')
    expect(result.bankId).toBe('bank-b')
  })

  it('returns unknown-institution for unrecognized sender', async () => {
    mockFindBankBySenderId.mockReturnValue(null)
    mockFindBankByName.mockReturnValue(null)

    const sms = { body: 'Payment made Rs.500', address: 'UNKNOWN' }
    const result = await matchSmsToAccount(sms, accounts, { pinHash: 'pin' })

    expect(result.matched).toBe(false)
    expect(result.accountId).toBeNull()
    expect(result.confidence).toBeNull()
    expect(result.reason).toBe('unknown-institution')
  })
})

describe('getAccountMatchReason', () => {
  it('returns correct human-readable strings', () => {
    expect(getAccountMatchReason({ reason: 'account-fragment-matched' })).toBe('Account number fragment matched a stored account.')
    expect(getAccountMatchReason({ reason: 'fragment-not-matched' })).toBe('Account number fragment found but did not match any stored account.')
    expect(getAccountMatchReason({ reason: 'sender-bank-single-account' })).toBe('Sender ID matched a bank and only one account is linked to it.')
    expect(getAccountMatchReason({ reason: 'ambiguous-bank-multiple-accounts' })).toBe('Sender ID matched a bank, but multiple accounts are linked to it.')
    expect(getAccountMatchReason({ reason: 'unknown-institution' })).toBe('Could not identify the bank or institution from this SMS.')
    expect(getAccountMatchReason(null)).toBe('No match information available.')
  })
})
