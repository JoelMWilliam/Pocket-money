import { describe, it, expect, vi } from 'vitest'
import { extractStatementBalance } from '../src/lib/pdfParser'

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn(() =>
        Promise.resolve({
          getTextContent: vi.fn(() =>
            Promise.resolve({
              items: [{ str: 'Closing balance LKR 5000.00' }]
            })
          )
        })
      )
    })
  }))
}))

describe('extractStatementBalance', () => {
  it('extracts closing balance with LKR', () => {
    const text = 'Your closing balance LKR 50,000.00 as at 2026-07-01'
    expect(extractStatementBalance(text)).toBe(50000)
  })

  it('extracts statement balance with Rs.', () => {
    const text = 'Statement balance Rs. 12,500.50'
    expect(extractStatementBalance(text)).toBe(12500.5)
  })

  it('extracts balance carried forward', () => {
    const text = 'Balance carried forward USD 1,234.56'
    expect(extractStatementBalance(text)).toBe(1234.56)
  })

  it('falls back to largest amount when no keyword is found', () => {
    const text = 'Transaction 1: Rs. 500.00\nTransaction 2: Rs. 10,000.00'
    expect(extractStatementBalance(text)).toBe(10000)
  })

  it('returns null when no balance is found', () => {
    expect(extractStatementBalance('Hello world')).toBeNull()
  })
})

describe('parsePDFText', async () => {
  const { parsePDFText } = await import('../src/lib/pdfParser')

  it('returns text from a PDF document', async () => {
    const text = await parsePDFText(new ArrayBuffer(0))
    expect(text).toContain('Closing balance LKR 5000.00')
  })
})
