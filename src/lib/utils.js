export function formatLKR(amount) {
  const value = Number(amount) || 0
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  const sign = value < 0 ? '-' : ''
  return `${sign}LKR ${formatted}`
}

export function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export function formatShortDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short'
  })
}

export function formatRelativeMonth(date) {
  return new Date(date).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric'
  })
}

export function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function todayInputDate() {
  return new Date().toISOString().slice(0, 10)
}

export function nowInputTime() {
  return new Date().toTimeString().slice(0, 5)
}
