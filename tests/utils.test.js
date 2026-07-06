import { describe, it, expect } from 'vitest'
import {
  formatLKR,
  formatDate,
  formatShortDate,
  formatRelativeMonth,
  getCurrentMonth,
  generateId,
  clamp,
  todayInputDate,
  nowInputTime
} from '../src/lib/utils'

describe('formatLKR', () => {
  it('formats positive values with LKR prefix and two decimals', () => {
    expect(formatLKR(1500)).toBe('LKR 1,500.00')
    expect(formatLKR(1234567.89)).toBe('LKR 1,234,567.89')
  })

  it('formats negative values with a minus sign', () => {
    expect(formatLKR(-500)).toBe('-LKR 500.00')
  })

  it('handles zero and non-numeric inputs', () => {
    expect(formatLKR(0)).toBe('LKR 0.00')
    expect(formatLKR(null)).toBe('LKR 0.00')
    expect(formatLKR(undefined)).toBe('LKR 0.00')
    expect(formatLKR('')).toBe('LKR 0.00')
  })
})

describe('formatDate', () => {
  it('returns a readable date string', () => {
    expect(formatDate('2026-07-06')).toMatch(/6 Jul 2026/)
  })
})

describe('formatShortDate', () => {
  it('returns short day and month', () => {
    expect(formatShortDate('2026-07-06')).toMatch(/6 Jul/)
  })
})

describe('formatRelativeMonth', () => {
  it('returns month and year', () => {
    expect(formatRelativeMonth('2026-07-06')).toMatch(/Jul 2026/)
  })
})

describe('getCurrentMonth', () => {
  it('returns YYYY-MM', () => {
    const result = getCurrentMonth()
    expect(result).toMatch(/^\d{4}-\d{2}$/)
  })
})

describe('generateId', () => {
  it('produces unique non-empty strings', () => {
    const a = generateId()
    const b = generateId()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThan(0)
  })
})

describe('clamp', () => {
  it('clamps values between min and max', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(15, 0, 10)).toBe(10)
  })
})

describe('todayInputDate', () => {
  it('returns YYYY-MM-DD', () => {
    expect(todayInputDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('nowInputTime', () => {
  it('returns HH:MM', () => {
    expect(nowInputTime()).toMatch(/^\d{2}:\d{2}$/)
  })
})
