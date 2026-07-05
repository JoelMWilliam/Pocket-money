import DOMPurify from 'dompurify'

export function sanitizeText(input, maxLength = 500) {
  if (typeof input !== 'string') return ''
  const trimmed = input.trim().slice(0, maxLength)
  return DOMPurify.sanitize(trimmed, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

export function sanitizeUsername(input) {
  if (typeof input !== 'string') return ''
  return input.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32)
}

export function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return []
  return tags
    .map((t) => (typeof t === 'string' ? t.trim().toLowerCase().replace(/[^a-z0-9\u0d80-\u0dff\s_-]/gi, '').slice(0, 32) : ''))
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 20)
}
