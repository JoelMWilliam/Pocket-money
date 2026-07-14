import { Capacitor, registerPlugin } from '@capacitor/core'
import { readNativeSms } from './biometric'
import { decryptAccountNumber, extractAccountHint, getFirst4Digits, getLast4Digits } from './accountNumber'

const SmsReader = registerPlugin('SmsReader')

const CURRENCY_RE = /(?:LKR|Rs\.?|Rs:|USD|US\$|\\\$|EUR|€|GBP|£|INR|₹|AED|CAD|AUD|SGD|JPY|CNY)/i
const AMOUNT_RE = new RegExp(`(?:${CURRENCY_RE.source})\\s*([0-9,]+(?:\\.[0-9]{1,2})?)`, 'i')
const AMOUNT_RE_CURRENCY_AFTER = new RegExp(`([0-9,]+(?:\\.[0-9]{1,2})?)\\s*(?:${CURRENCY_RE.source})`, 'i')
const AMOUNT_RE_GENERIC = /([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/

// Strict bank transaction alert phrases. Promotional messages often contain
// amounts and loose keywords like "cashback" or "win", so we require one of
// these concrete transaction verbs before parsing.
const BANK_ALERT_RE = /\b(?:debited|credited|withdrawn|deposited|transferred|payment made|deducted|sent to|received from|spent at|used at|charged to|purchase at|atm withdrawal|pos transaction|upi transaction|fund transfer|transaction alert|online banking|internet banking|mobile banking|neft|rtgs|imps)\b/i

// Promotional / marketing words that should never be treated as transactions.
const PROMOTIONAL_RE = /\b(?:promo|promotion|offer|discount|voucher|coupon|win|winner|lucky|draw|free|gift|reward|cashback|subscribe|unsubscribe|click|visit|t\u0026c|terms and conditions|limited time|valid till|valid until|expires|shop now|buy now|download|install|campaign|up to|save up|flat|extra|opt out|to opt|insurance|loan approved|pre-approved|eligible for|apply now|apply today|get rs\.|msg ?\u0026 ?data|marketing)\b/i

export function parseSmsTransaction(body) {
  if (!body) return null

  // Reject promotional messages outright.
  if (PROMOTIONAL_RE.test(body)) return null

  // Require a concrete bank transaction alert keyword.
  if (!BANK_ALERT_RE.test(body)) return null

  let type = 'expense'
  if (/(credited|received|deposited|salary|refund|added to|received from|wired to|funded|top-up)/i.test(body)) type = 'income'
  else if (/(transferred|transfer|moved from|sent from|between accounts)/i.test(body)) type = 'transfer'

  let amountMatch = body.match(AMOUNT_RE) || body.match(AMOUNT_RE_CURRENCY_AFTER)
  if (!amountMatch) {
    // Fallback: find a number, but only after we already confirmed a bank alert.
    const generic = body.match(AMOUNT_RE_GENERIC)
    if (generic) amountMatch = generic
  }
  if (!amountMatch) return null

  const amount = Number(amountMatch[1].replace(/,/g, ''))
  if (!amount || amount <= 0) return null

  const notePatterns = [
    /(?:at|to|from|for|via|merchant|with|@|on)\s*([A-Za-z0-9\s&'.,\-\/()]{2,40})/i,
    /(?:purchase|payment|spent|paid)\s+(?:at|to|from|for|via)\s*([A-Za-z0-9\s&'.,\-\/()]{2,40})/i,
    /(?:credited|deposited|received)\s+(?:to|by|from)\s*([A-Za-z0-9\s&'.,\-\/()]{2,40})/i,
    /(?:transfer|transferred)\s+(?:to|from)\s*([A-Za-z0-9\s&'.,\-\/()]{2,40})/i
  ]
  let note = ''
  for (const re of notePatterns) {
    const m = body.match(re)
    if (m) {
      note = m[1].trim().replace(/\s+/g, ' ')
      break
    }
  }
  if (!note) note = type === 'income' ? 'Income' : 'Expense'

  return { amount, note, type, raw: body }
}

export function isNativeSmsAvailable() {
  return Capacitor.isNativePlatform()
}

export async function requestSmsPermission() {
  if (!isNativeSmsAvailable()) return false
  try {
    const perm = await SmsReader.checkPermission()
    if (perm.granted) return true
    const req = await SmsReader.requestPermission()
    return req.granted
  } catch (err) {
    console.error('SMS permission request failed', err)
    return false
  }
}

export async function readSmsMessages() {
  if (!isNativeSmsAvailable()) return []
  return readNativeSms()
}

export async function importSmsMessages(messages, store) {
  const imported = []
  const { accounts, categories, addTransaction, settings, updateSettings, auth } = store
  const currentUser = auth.currentUser
  const pinHash = currentUser ? auth.users[currentUser]?.pinHash : null
  const defaultAccount = accounts[0]?.id
  const defaultCategory = categories.find((c) => c.type === 'expense')?.id
  if (!defaultAccount || !defaultCategory) return imported

  // Build decrypted account hints for SMS matching.
  const accountHints = []
  for (const a of accounts) {
    if (!a.accountNumberEncrypted || !pinHash) {
      accountHints.push({ id: a.id, last4: null, first4: null })
      continue
    }
    const number = await decryptAccountNumber(a.accountNumberEncrypted, pinHash)
    accountHints.push({
      id: a.id,
      last4: getLast4Digits(number),
      first4: getFirst4Digits(number)
    })
  }

  const importedIds = new Set(settings.smsImportedIds || [])
  const newIds = new Set(importedIds)
  let lastImportedAt = settings.smsLastImportedAt || 0

  for (const m of messages) {
    if (!m.body || importedIds.has(String(m.id))) continue
    const parsed = parseSmsTransaction(m.body)
    if (!parsed) continue

    const dateObj = typeof m.date === 'number' ? new Date(m.date) : new Date(m.date || Date.now())
    const date = dateObj.toISOString().slice(0, 10)
    const msgTime = dateObj.getTime()

    // Match by last 4 (or first 4) digits if the SMS contains an account hint.
    const hint = extractAccountHint(m.body)
    const accountId = hint
      ? accountHints.find((h) => h.last4 === hint || h.first4 === hint)?.id || defaultAccount
      : defaultAccount

    addTransaction({
      accountId,
      categoryId: defaultCategory,
      amount: parsed.amount,
      type: parsed.type,
      date,
      note: parsed.note,
      tags: ['sms-import']
    })

    newIds.add(String(m.id))
    lastImportedAt = Math.max(lastImportedAt, msgTime)
    imported.push({ ...m, parsed })
  }

  updateSettings({
    smsImportedIds: Array.from(newIds).slice(-500),
    smsLastImportedAt: lastImportedAt
  })

  return imported
}

export async function maybeAutoImportSms(store) {
  if (!isNativeSmsAvailable()) return []
  const { settings } = store
  if (!settings.smsAutoImportEnabled) return []
  const granted = await requestSmsPermission()
  if (!granted) return []
  const messages = await readSmsMessages()
  return importSmsMessages(messages, store)
}

export async function checkSmsPermission() {
  if (!isNativeSmsAvailable()) return false
  try {
    const perm = await SmsReader.checkPermission()
    return perm.granted
  } catch (err) {
    return false
  }
}
