import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockStore = {
  settings: {
    smsAutoImportEnabled: true
  },
  accounts: [
    { id: 'acc-1', name: 'Bank', type: 'bank', balance: 50000 }
  ]
}

let mockSmsImportedEnabled = true

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
  registerPlugin: vi.fn(() => ({}))
}))

vi.mock('../src/lib/sms', () => ({
  requestSmsPermission: vi.fn(() => Promise.resolve(true)),
  readSmsMessages: vi.fn(() => Promise.resolve([
    { body: 'Spent LKR 500 at Food City', date: new Date().toISOString() },
    { body: 'Received LKR 10000 salary', date: new Date().toISOString() }
  ])),
  importSmsMessages: vi.fn(() => Promise.resolve([
    { id: 'tx-1', amount: 500, type: 'expense' },
    { id: 'tx-2', amount: 10000, type: 'income' }
  ]))
}))

vi.mock('../src/lib/gmailSync', () => ({
  isEmailSyncConfigured: vi.fn(() => true),
  syncEmailsToTransactions: vi.fn(() => Promise.resolve({ imported: 3, total: 5 }))
}))

vi.mock('../src/lib/upiNotifications', () => ({
  importPaymentNotifications: vi.fn(() => Promise.resolve({ imported: 2 })),
  getPaymentNotifications: vi.fn(() => Promise.resolve([]))
}))

vi.mock('../src/lib/merchantRules', () => ({
  autoCategorize: vi.fn((tx) => ({ ...tx, categoryId: 'cat-food' }))
}))

vi.mock('../src/lib/dedup', () => ({
  deduplicateTransactions: vi.fn((parsed, existing) => ({ unique: parsed }))
}))

import { runAutoCapturePipeline, getAvailableSources } from '../src/lib/autoCapture'

describe('runAutoCapturePipeline', () => {
  beforeEach(() => {
    mockStore.settings.smsAutoImportEnabled = true
    mockSmsImportedEnabled = true
  })

  it('imports from all sources and returns totals', async () => {
    const result = await runAutoCapturePipeline(mockStore)
    expect(result.sms.imported).toBe(2)
    expect(result.email.imported).toBe(3)
    expect(result.upi.imported).toBe(2)
    expect(result.total).toBe(7)
    expect(result.sms.error).toBeNull()
    expect(result.email.error).toBeNull()
    expect(result.upi.error).toBeNull()
  })

  it('skips SMS when smsAutoImportEnabled is false', async () => {
    mockStore.settings.smsAutoImportEnabled = false
    const result = await runAutoCapturePipeline(mockStore)
    expect(result.sms.imported).toBe(0)
    expect(result.email.imported).toBe(3)
    expect(result.upi.imported).toBe(2)
  })

  it('handles SMS permission denied', async () => {
    const sms = await import('../src/lib/sms')
    sms.requestSmsPermission.mockResolvedValueOnce(false)
    const result = await runAutoCapturePipeline(mockStore)
    expect(result.sms.imported).toBe(0)
    expect(result.email.imported).toBe(3)
  })

  it('handles SMS import error gracefully', async () => {
    const sms = await import('../src/lib/sms')
    sms.requestSmsPermission.mockRejectedValueOnce(new Error('Permission denied'))
    const result = await runAutoCapturePipeline(mockStore)
    expect(result.sms.error).toBe('Permission denied')
    expect(result.email.imported).toBe(3)
    expect(result.total).toBe(5)
  })
})

describe('getAvailableSources', () => {
  it('returns SMS and UPI sources when email is not configured', async () => {
    const gmailSync = await import('../src/lib/gmailSync')
    gmailSync.isEmailSyncConfigured.mockReturnValue(false)
    const sources = await getAvailableSources(mockStore)
    const ids = sources.map((s) => s.id)
    expect(ids).toContain('sms')
    expect(ids).toContain('upi')
    expect(ids).toContain('receipt')
    expect(ids).not.toContain('email')
  })

  it('includes email source when configured', async () => {
    const gmailSync = await import('../src/lib/gmailSync')
    gmailSync.isEmailSyncConfigured.mockReturnValue(true)
    const sources = await getAvailableSources(mockStore)
    const ids = sources.map((s) => s.id)
    expect(ids).toContain('sms')
    expect(ids).toContain('email')
    expect(ids).toContain('upi')
    expect(ids).toContain('receipt')
  })
})
