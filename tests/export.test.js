import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { validateBackupData, sanitizeImportedSettings, exportTransactionsToCSV } from '../src/lib/export'

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false }
}))

describe('export security', () => {
  beforeEach(() => {
    if (!URL.createObjectURL) URL.createObjectURL = vi.fn()
    if (!URL.revokeObjectURL) URL.revokeObjectURL = vi.fn()
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects backups with unknown keys', () => {
    expect(() => validateBackupData({ malicious: true })).toThrow('unknown key')
  })

  it('rejects backups where arrays are not arrays', () => {
    expect(() => validateBackupData({ accounts: 'not-array' })).toThrow('accounts must be an array')
  })

  it('rejects oversized backups', () => {
    const huge = { transactions: new Array(100000).fill({ x: 'a'.repeat(1000) }) }
    expect(() => validateBackupData(huge)).toThrow('file too large')
  })

  it('preserves local sensitive settings on import', () => {
    const imported = {
      googleDriveBackupEnabled: true,
      googleDriveBackupEmail: 'attacker@gmail.com',
      currency: 'LKR',
      seedColor: '#0A84FF'
    }
    const current = {
      googleDriveBackupEnabled: false,
      googleDriveBackupEmail: null,
      currency: 'USD'
    }
    const result = sanitizeImportedSettings(imported, current)
    expect(result.googleDriveBackupEnabled).toBe(false)
    expect(result.googleDriveBackupEmail).toBeNull()
    expect(result.currency).toBe('LKR')
  })

  it('prevents CSV formula injection in exported notes', async () => {
    const transactions = [{
      date: '2026-07-06',
      type: 'expense',
      amount: 100,
      accountId: 'acc-1',
      categoryId: 'cat-1',
      note: "=cmd|' /C calc'!A0",
      tags: []
    }]
    const accounts = [{ id: 'acc-1', name: 'Bank' }]
    const categories = [{ id: 'cat-1', name: 'Food' }]

    let capturedBlob
    URL.createObjectURL.mockImplementation((blob) => { capturedBlob = blob; return 'blob:test' })
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') {
        el.click = vi.fn()
        el.remove = vi.fn()
      }
      return el
    })

    await exportTransactionsToCSV(transactions, accounts, categories)
    const csv = await capturedBlob.text()
    expect(csv).toContain("'" + "=cmd|' /C calc'!A0")
    expect(csv).not.toContain('"=cmd')
  })
})
