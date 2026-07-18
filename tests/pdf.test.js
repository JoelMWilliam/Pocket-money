import { describe, it, expect, vi } from 'vitest'

vi.mock('pdf-lib', () => {
  const mockDoc = {
    embedFont: vi.fn(() => ({
      widthOfTextAtSize: vi.fn(() => 100)
    })),
    addPage: vi.fn(() => ({
      drawText: vi.fn(),
      drawRectangle: vi.fn(),
      drawLine: vi.fn()
    })),
    save: vi.fn(() => Promise.resolve(new Uint8Array([1, 2, 3])))
  }
  return {
    PDFDocument: { create: vi.fn(() => Promise.resolve(mockDoc)) },
    StandardFonts: { Helvetica: 'Helvetica', HelveticaBold: 'HelveticaBold' },
    rgb: vi.fn(() => ({}))
  }
})

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false }
}))

vi.mock('../src/lib/share', () => ({
  downloadOrShare: vi.fn(() => Promise.resolve(true))
}))

vi.mock('../src/lib/utils', () => ({
  formatDate: (d) => d
}))

import { buildFinanceReportPDF, exportPDFReport } from '../src/lib/pdf'
import { downloadOrShare } from '../src/lib/share'

describe('buildFinanceReportPDF', () => {
  const baseData = {
    settings: { currency: 'LKR' },
    accounts: [],
    transactions: [],
    categories: [],
    budgets: []
  }

  it('returns a Blob with type application/pdf', async () => {
    const blob = await buildFinanceReportPDF(baseData)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/pdf')
  })

  it('handles empty accounts and transactions', async () => {
    const blob = await buildFinanceReportPDF(baseData)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/pdf')
  })

  it('includes budgets section when budgets.length > 0', async () => {
    const data = {
      ...baseData,
      budgets: [
        { id: 'b1', categoryId: 'cat-1', amount: 5000, period: 'monthly', rollover: false }
      ]
    }
    const blob = await buildFinanceReportPDF(data)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/pdf')
  })
})

describe('exportPDFReport', () => {
  it('calls downloadOrShare with correct filename pattern', async () => {
    const data = {
      settings: { currency: 'LKR' },
      accounts: [{ id: 'a1', name: 'Bank', type: 'bank', balance: 1000 }],
      transactions: [],
      categories: [],
      budgets: []
    }
    await exportPDFReport(data)
    expect(downloadOrShare).toHaveBeenCalledTimes(1)
    const [blob, filename, title] = downloadOrShare.mock.calls[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/pdf')
    expect(filename).toMatch(/^pocket-money-report-\d{4}-\d{2}-\d{2}\.pdf$/)
    expect(title).toBe('Pocket Money Report')
  })
})
