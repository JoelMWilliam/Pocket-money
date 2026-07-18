import { describe, it, expect, vi, beforeEach } from 'vitest'

let isNativePlatform = false

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => isNativePlatform }
}))

vi.mock('capacitor-email-composer', () => ({
  EmailComposer: { open: vi.fn(() => Promise.resolve()) }
}))

vi.mock('../src/lib/sanitize', () => ({
  escapeHtml: vi.fn((s) => {
    if (typeof s !== 'string') return String(s)
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  })
}))

vi.mock('../src/lib/utils', () => ({
  formatDate: (d) => d
}))

vi.mock('../src/lib/share', () => ({
  nativeShare: vi.fn(() => Promise.resolve(true))
}))

import { buildEmailReport, sendEmailReport } from '../src/lib/email'
import { EmailComposer } from 'capacitor-email-composer'
import { nativeShare } from '../src/lib/share'

describe('buildEmailReport', () => {
  const baseData = {
    settings: { currency: 'LKR' },
    accounts: [{ id: 'a1', name: 'Bank', type: 'bank', balance: 50000 }],
    transactions: [
      { id: 't1', date: '2026-07-01', type: 'income', amount: 10000, accountId: 'a1', categoryId: 'cat-1', note: 'Salary' },
      { id: 't2', date: '2026-07-02', type: 'expense', amount: 2500, accountId: 'a1', categoryId: 'cat-2', note: 'Groceries' }
    ],
    categories: [
      { id: 'cat-1', name: 'Salary' },
      { id: 'cat-2', name: 'Food' }
    ],
    budgets: []
  }

  it('returns an object with subject, html, and text properties', () => {
    const result = buildEmailReport(baseData)
    expect(result).toHaveProperty('subject')
    expect(result).toHaveProperty('html')
    expect(result).toHaveProperty('text')
  })

  it('HTML contains the total balance', () => {
    const result = buildEmailReport(baseData)
    expect(result.html).toContain('Total Balance')
    expect(result.html).toContain('50000.00')
  })

  it('text version is plain and contains summary info', () => {
    const result = buildEmailReport(baseData)
    expect(result.text).toContain('Total Balance')
    expect(result.text).toContain('Total Income')
    expect(result.text).toContain('Total Expenses')
    expect(result.text).not.toContain('<')
  })

  it('handles empty budgets and does not include budgets section', () => {
    const result = buildEmailReport(baseData)
    expect(result.html).not.toContain('Budgets for')
    expect(result.text).not.toContain('budget,')
  })

  it('uses escapeHtml to prevent XSS in account names', () => {
    const malicious = '<script>alert("xss")</script>'
    const data = {
      ...baseData,
      accounts: [{ id: 'a1', name: malicious, type: 'bank', balance: 100 }]
    }
    const result = buildEmailReport(data)
    expect(result.html).toContain('&lt;script&gt;')
    expect(result.html).not.toContain('<script>')
  })

  it('returns correct subject format', () => {
    const result = buildEmailReport(baseData)
    expect(result.subject).toMatch(/^Pocket Money Report - \w+ \d{4}$/)
  })
})

describe('sendEmailReport', () => {
  const report = {
    subject: 'Pocket Money Report - July 2026',
    html: '<p>Test</p>',
    text: 'Test'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    isNativePlatform = false
    window.open = vi.fn()
  })

  it('on native platform, calls EmailComposer.open with subject, body, isHtml: true', async () => {
    isNativePlatform = true
    const result = await sendEmailReport(report)
    expect(result).toBe(true)
    expect(EmailComposer.open).toHaveBeenCalledWith({
      subject: report.subject,
      body: report.html,
      isHtml: true
    })
  })

  it('on web, opens a mailto: URL via window.open', async () => {
    const result = await sendEmailReport(report)
    expect(result).toBe(true)
    expect(window.open).toHaveBeenCalledWith(
      expect.stringMatching(/^mailto:/),
      '_blank'
    )
  })

  it('falls back to nativeShare when EmailComposer fails', async () => {
    isNativePlatform = true
    EmailComposer.open.mockRejectedValue(new Error('Composer not available'))
    const result = await sendEmailReport(report)
    expect(result).toBe(true)
    expect(nativeShare).toHaveBeenCalledWith({
      title: report.subject,
      text: `${report.subject}\n\n${report.text}`
    })
  })
})
