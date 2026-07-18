import { describe, it, expect, vi } from 'vitest'
import { sanitizeText, escapeHtml, sanitizeUsername, sanitizeTags } from '../src/lib/sanitize'

vi.mock('dompurify', () => ({
  default: {
    sanitize: (input) => input.replace(/<[^>]*>/g, '')
  }
}))

describe('sanitizeText', () => {
  it('returns empty string for non-string input', () => {
    expect(sanitizeText(null)).toBe('')
    expect(sanitizeText(undefined)).toBe('')
    expect(sanitizeText(123)).toBe('')
    expect(sanitizeText({})).toBe('')
    expect(sanitizeText([])).toBe('')
  })

  it('trims whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello')
  })

  it('truncates to maxLength', () => {
    const long = 'a'.repeat(600)
    expect(sanitizeText(long, 500).length).toBe(500)
  })

  it('strips HTML tags via DOMPurify', () => {
    expect(sanitizeText('<script>alert("xss")</script>')).toBe('alert("xss")')
    expect(sanitizeText('<img src=x onerror=alert(1)>')).toBe('')
    expect(sanitizeText('<b>bold</b>')).toBe('bold')
  })

  it('handles mixed safe and unsafe content', () => {
    expect(sanitizeText('Hello <script>bad()</script> world')).toBe('Hello bad() world')
  })
})

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    expect(escapeHtml("it's a test")).toBe('it&#039;s a test')
    expect(escapeHtml('a & b > c < d')).toBe('a &amp; b &gt; c &lt; d')
  })

  it('converts non-string input to string', () => {
    expect(escapeHtml(42)).toBe('42')
    expect(escapeHtml(null)).toBe('null')
  })

  it('preserves safe strings', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
    expect(escapeHtml('')).toBe('')
  })
})

describe('sanitizeUsername', () => {
  it('lowercases and strips invalid characters (spaces stripped, not converted)', () => {
    expect(sanitizeUsername('John Doe!')).toBe('johndoe')
    expect(sanitizeUsername('User@Name#123')).toBe('username123')
    expect(sanitizeUsername('  Test-User_123  ')).toBe('test-user_123')
  })

  it('truncates to 32 chars', () => {
    expect(sanitizeUsername('a'.repeat(50)).length).toBe(32)
  })

  it('returns empty for non-string input', () => {
    expect(sanitizeUsername(null)).toBe('')
    expect(sanitizeUsername(undefined)).toBe('')
    expect(sanitizeUsername(123)).toBe('')
  })
})

describe('sanitizeTags', () => {
  it('filters invalid tags and deduplicates', () => {
    const result = sanitizeTags(['Food', 'food', '!@#$', '', '  Transport  ', null, 'food'])
    expect(result).toEqual(['food', 'transport'])
  })

  it('limits to 20 tags', () => {
    const tags = Array.from({ length: 30 }, (_, i) => `tag${i}`)
    expect(sanitizeTags(tags).length).toBe(20)
  })

  it('truncates individual tags to 32 chars', () => {
    const result = sanitizeTags(['a'.repeat(50)])
    expect(result[0].length).toBe(32)
  })

  it('returns empty array for non-array input', () => {
    expect(sanitizeTags(null)).toEqual([])
    expect(sanitizeTags('hello')).toEqual([])
    expect(sanitizeTags(undefined)).toEqual([])
  })

  it('preserves Sinhala unicode characters', () => {
    const result = sanitizeTags(['\u0D9A\u0DD4\u0DA0\u0DD2'])
    expect(result).toEqual(['\u0D9A\u0DD4\u0DA0\u0DD2'])
  })
})
