import { encryptData, decryptData } from './crypto'

export async function encryptAccountNumber(number, pinHash) {
  if (!number || !pinHash) return null
  const clean = String(number).replace(/\s/g, '')
  if (!clean) return null
  return encryptData(clean, pinHash)
}

export async function decryptAccountNumber(encrypted, pinHash) {
  if (!encrypted || !pinHash) return null
  try {
    return await decryptData(encrypted, pinHash)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to decrypt account number', err)
    return null
  }
}

export function getLast4Digits(number) {
  if (!number) return null
  const digits = String(number).replace(/\D/g, '')
  return digits.slice(-4) || null
}

export function getFirst4Digits(number) {
  if (!number) return null
  const digits = String(number).replace(/\D/g, '')
  return digits.length >= 4 ? digits.slice(0, 4) : null
}

export function extractAccountHint(body) {
  if (!body) return null
  const patterns = [
    /ending\s*[:\s]*(\d{4})/i,
    /xx\s*(\d{4})/i,
    /a\/c\s*(?:no\.?)?\s*[\*x]*(\d{4})/i,
    /account\s*(?:no\.?)?\s*[\*x]*(\d{4})/i,
    /card\s*(?:no\.?)?\s*[\*x]*(\d{4})/i,
    /debited to.*(?:ac|account|card).*?(\d{4})/i,
    /credited to.*(?:ac|account|card).*?(\d{4})/i,
    /(?:ac|account|card)\s*(?:no\.?)?\s*[\*x]*(\d{4})/i
  ]
  for (const re of patterns) {
    const m = body.match(re)
    if (m) return m[1]
  }
  return null
}

export function maskAccountNumber(number) {
  const digits = String(number).replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length <= 4) return '•'.repeat(digits.length)
  return '•'.repeat(digits.length - 4) + digits.slice(-4)
}
