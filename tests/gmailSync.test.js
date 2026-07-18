import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as gmailSync from '../src/lib/gmailSync'

vi.mock('@capgo/capacitor-social-login', () => ({
  SocialLogin: {
    initialize: vi.fn(() => Promise.resolve()),
    login: vi.fn(() => Promise.resolve({ result: { accessToken: 'mock-token', email: 'test@test.com' } })),
    logout: vi.fn(() => Promise.resolve())
  }
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
  registerPlugin: vi.fn(() => ({}))
}))

vi.mock('../src/lib/emailParser', () => ({
  parseEmailBatch: vi.fn((emails) =>
    emails.map((e, i) => ({
      id: e.id,
      date: new Date().toISOString(),
      amount: 49.99 + i,
      description: e.subject,
      sourceDetails: { orderNumber: `ORD-${i}` }
    }))
  )
}))

vi.mock('../src/lib/dedup', () => ({
  deduplicateTransactions: vi.fn((parsed) => ({ unique: parsed }))
}))

vi.mock('../src/lib/merchantRules', () => ({
  autoCategorize: vi.fn((txn) => ({ ...txn, category: 'Food' }))
}))

function makeGmailMessage(id, overrides = {}) {
  const body = overrides.body || 'Your order total is $49.99.'
  return {
    id,
    payload: {
      headers: [
        { name: 'From', value: overrides.sender || 'noreply@shop.com' },
        { name: 'Subject', value: overrides.subject || 'Order Confirmation #123' },
        { name: 'Date', value: overrides.date || 'Mon, 15 Jul 2024 10:30:00 +0000' }
      ],
      mimeType: 'text/plain',
      body: { data: btoa(body) }
    }
  }
}

describe('gmailSync', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    if (gmailSync.isEmailSyncConfigured()) {
      await gmailSync.disconnectGmail()
    }
  })

  describe('isEmailSyncConfigured', () => {
    it('returns false initially', () => {
      expect(gmailSync.isEmailSyncConfigured()).toBe(false)
    })

    it('returns true after connectGmail', async () => {
      await gmailSync.connectGmail()
      expect(gmailSync.isEmailSyncConfigured()).toBe(true)
    })
  })

  describe('connectGmail', () => {
    it('returns accessToken and email', async () => {
      const result = await gmailSync.connectGmail()
      expect(result).toEqual({
        accessToken: 'mock-token',
        email: 'test@test.com'
      })
    })
  })

  describe('disconnectGmail', () => {
    it('clears cached token', async () => {
      await gmailSync.connectGmail()
      expect(gmailSync.isEmailSyncConfigured()).toBe(true)

      await gmailSync.disconnectGmail()
      expect(gmailSync.isEmailSyncConfigured()).toBe(false)
    })
  })

  describe('fetchTransactionEmails', () => {
    beforeEach(() => {
      globalThis.fetch = vi.fn()
    })

    it('throws when not connected', async () => {
      await expect(gmailSync.fetchTransactionEmails()).rejects.toThrow('Gmail not connected')
    })

    it('returns parsed email objects with sender, subject, body, dateReceived', async () => {
      await gmailSync.connectGmail()

      const msg1 = makeGmailMessage('msg1', {
        sender: 'orders@amazon.com',
        subject: 'Your Amazon order #123',
        date: 'Tue, 16 Jul 2024 14:22:00 +0000',
        body: 'Thank you for your order. Total: $34.99'
      })
      const msg2 = makeGmailMessage('msg2', {
        sender: 'receipts@stripe.com',
        subject: 'Receipt from Coffee Shop',
        date: 'Wed, 17 Jul 2024 09:15:00 +0000',
        body: 'You spent $5.50 at Coffee Shop.'
      })

      let callCount = 0
      globalThis.fetch.mockImplementation((url) => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ messages: [{ id: 'msg1' }, { id: 'msg2' }] })
          })
        }
        const id = url.includes('msg1') ? 'msg1' : 'msg2'
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(id === 'msg1' ? msg1 : msg2)
        })
      })

      const emails = await gmailSync.fetchTransactionEmails()
      expect(emails).toHaveLength(2)
      expect(emails[0]).toEqual({
        id: 'msg1',
        sender: 'orders@amazon.com',
        subject: 'Your Amazon order #123',
        body: 'Thank you for your order. Total: $34.99',
        dateReceived: 'Tue, 16 Jul 2024 14:22:00 +0000'
      })
      expect(emails[1]).toEqual({
        id: 'msg2',
        sender: 'receipts@stripe.com',
        subject: 'Receipt from Coffee Shop',
        body: 'You spent $5.50 at Coffee Shop.',
        dateReceived: 'Wed, 17 Jul 2024 09:15:00 +0000'
      })
    })
  })

  describe('syncEmailsToTransactions', () => {
    beforeEach(() => {
      globalThis.fetch = vi.fn()
    })

    it('returns { imported: N, total: N } after processing emails', async () => {
      await gmailSync.connectGmail()

      const msg1 = makeGmailMessage('msg1')
      const msg2 = makeGmailMessage('msg2')

      let callCount = 0
      globalThis.fetch.mockImplementation((url) => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ messages: [{ id: 'msg1' }, { id: 'msg2' }] })
          })
        }
        const id = url.includes('msg1') ? 'msg1' : 'msg2'
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(id === 'msg1' ? msg1 : msg2)
        })
      })

      const addTransaction = vi.fn()
      const updateSettings = vi.fn()
      const store = {
        addTransaction,
        settings: { emailImportedIds: [] },
        updateSettings,
        transactions: []
      }

      const result = await gmailSync.syncEmailsToTransactions(store)
      expect(result).toEqual({ imported: 2, total: 2 })
      expect(addTransaction).toHaveBeenCalledTimes(2)
      expect(addTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ['email-import'], category: 'Food' })
      )
      expect(updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ emailImportedIds: expect.any(Array) })
      )
    })
  })

  describe('connectGmail on non-native platform', () => {
    it('throws when isNativePlatform returns false', async () => {
      vi.resetModules()
      vi.doMock('@capacitor/core', () => ({
        Capacitor: { isNativePlatform: () => false },
        registerPlugin: vi.fn(() => ({}))
      }))
      const mod = await import('../src/lib/gmailSync')
      await expect(mod.connectGmail()).rejects.toThrow('Email sync requires the mobile app.')
    })
  })
})
