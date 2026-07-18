import { Capacitor, registerPlugin } from '@capacitor/core'
import { readNativeSms } from './biometric'
import { extractAccountFragment, matchSmsToAccount, buildAccountHints, getAccountMatchReason } from './accountMatcher'
import { autoCategorize } from './merchantRules'
import { detectTransferIntent, createInternalTransferTransaction, isTransferKeyword } from './transfers'
import { findBankByName, findBankBySenderId } from './banks'

const SmsReader = registerPlugin('SmsReader')

const CURRENCY_RE = /(?:LKR|Rs\.?|Rs:|USD|US\$|\\\$|EUR|€|GBP|£|INR|₹|AED|CAD|AUD|SGD|JPY|CNY)/i
const AMOUNT_RE = new RegExp(`(?:${CURRENCY_RE.source})\\s*([0-9,]+(?:\\.[0-9]{1,2})?)`, 'i')
const AMOUNT_RE_CURRENCY_AFTER = new RegExp(`([0-9,]+(?:\\.[0-9]{1,2})?)\\s*(?:${CURRENCY_RE.source})`, 'i')
const AMOUNT_RE_GENERIC = /([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/

const BANK_ALERT_RE = /\b(?:debited|credited|withdrawn|deposited|transferred|payment made|deducted|sent to|received from|spent at|used at|charged to|purchase at|atm withdrawal|pos transaction|upi transaction|fund transfer|transaction alert|online banking|internet banking|mobile banking|neft|rtgs|imps)\b/i

const PROMOTIONAL_RE = /\b(?:promo|promotion|offer|discount|voucher|coupon|win|winner|lucky|draw|free|gift|reward|cashback|subscribe|unsubscribe|click|visit|t\u0026c|terms and conditions|limited time|valid till|valid until|expires|shop now|buy now|download|install|campaign|up to|save up|flat|extra|opt out|to opt|insurance|loan approved|pre-approved|eligible for|apply now|apply today|get rs\.|msg ?\u0026 ?data|marketing)\b/i

const DECLINED_RE = /\b(?:declined|failed|unsuccessful|not processed|could not|cannot be|insufficient funds|exceeds limit|invalid pin|wrong pin|timed out|expired)\b/i

const BALANCE_INFO_RE = /\b(?:balance enquiry|outstanding|min balance|minimum balance|minimum amount|standing instruction|auto debit|stop payment|cheque return|cheque bounce|intimated|otp|one time pin|verification code|login|password|reset|registered for|enrolled for)\b/i

const DUPLICATE_TIME_WINDOW_MS = 2 * 60 * 1000

const REFNO_RE = /\b(?:ref(?:erence)?(?:\s*(?:no|number|#))?|rrn|utr|vpa|stan|txn\s*id|transaction\s*id|order\s*id)\s*[:#.-]?\s*([A-Z0-9]{6,20})\b/i

export function extractReferenceNumber(body) {
  if (!body) return null
  const m = String(body).match(REFNO_RE)
  return m ? m[1] : null
}

export function isTransactionSms(body) {
  if (!body) return false
  if (PROMOTIONAL_RE.test(body)) return false
  if (DECLINED_RE.test(body)) return false
  if (BALANCE_INFO_RE.test(body)) return false
  if (!BANK_ALERT_RE.test(body)) return false
  return true
}

export function parseSmsTransaction(body) {
  if (!body) return null
  if (!isTransactionSms(body)) return null

  let type = 'expense'
  if (/(credited|received|deposited|salary|refund|added to|received from|wired to|funded|top-up)/i.test(body)) type = 'income'
  else if (/(transferred|transfer|moved from|sent from|between accounts)/i.test(body)) type = 'transfer'

  let amountMatch = body.match(AMOUNT_RE) || body.match(AMOUNT_RE_CURRENCY_AFTER)
  if (!amountMatch) {
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

export function isDeclinedTransaction(body) {
  return DECLINED_RE.test(body)
}

export function isBalanceInfoSms(body) {
  return BALANCE_INFO_RE.test(body)
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

export async function checkSmsPermission() {
  if (!isNativeSmsAvailable()) return false
  try {
    const perm = await SmsReader.checkPermission()
    return perm.granted
  } catch (err) {
    return false
  }
}

export async function checkSmsPermissionHealth() {
  if (!isNativeSmsAvailable()) return { healthy: false, reason: 'non-native' }
  try {
    const perm = await SmsReader.checkPermission()
    if (!perm.granted) return { healthy: false, reason: 'not-granted' }
    try {
      const msgs = await readNativeSms()
      if (!Array.isArray(msgs)) return { healthy: false, reason: 'reader-unavailable' }
      return { healthy: true, reason: null, messageCount: msgs.length }
    } catch (readErr) {
      return { healthy: false, reason: 'reader-failed', detail: readErr.message }
    }
  } catch (err) {
    return { healthy: false, reason: 'permission-check-failed', detail: err.message }
  }
}

function isDuplicate(m, importedIds, existingTransactions) {
  if (importedIds.has(String(m.id))) return true
  if (!m.body || !existingTransactions?.length) return false
  const parsed = parseSmsTransaction(m.body)
  if (!parsed) return false
  const msgTime = typeof m.date === 'number' ? m.date : new Date(m.date || 0).getTime()
  const msgRef = extractReferenceNumber(m.body)
  const sender = (m.address || '').toUpperCase()
  for (const tx of existingTransactions) {
    if (tx.type !== parsed.type) continue
    if (Math.abs(tx.amount - parsed.amount) > 0.01) continue
    const txTime = new Date(tx.date || 0).getTime()
    if (Math.abs(txTime - msgTime) > DUPLICATE_TIME_WINDOW_MS) continue

    // Sender + reference: highest confidence — same bank's SMS with same Ref
    // within ±2 minutes is unambiguously the same transaction.
    if (sender && tx.smsAddress && tx.smsAddress.toUpperCase() === sender && msgRef && tx.smsRefNo === msgRef) {
      return true
    }
    // Sender + amount + time window: bank sent two SMS within 2 minutes for
    // the same amount with the same sender ID — almost certainly a duplicate.
    if (sender && tx.smsAddress && tx.smsAddress.toUpperCase() === sender) {
      return true
    }
    // Reference-only (sender not stored on older txs): same ref + amount + time.
    if (msgRef && tx.smsRefNo === msgRef) {
      return true
    }
    // Legacy heuristic: note substring overlap (for txs imported before refs
    // were stored). Keep a short shared-substring to avoid false positives.
    const txBody = tx.note || ''
    const shared = txBody.length > 5 && m.body.toLowerCase().includes(txBody.toLowerCase().slice(0, 10))
    if (shared) return true
  }
  return false
}

export async function importSmsMessages(messages, store) {
  const result = { imported: [], errors: [], duplicates: [], unmatched: [] }
  const { accounts, addTransaction, settings, updateSettings, auth, transactions } = store
  const currentUser = auth.currentUser
  const pinHash = currentUser ? auth.users[currentUser]?.pinHash : null

  if (!accounts?.length) {
    result.errors.push({ type: 'no-accounts', message: 'No accounts exist. Create an account before importing.' })
    return result
  }

  const accountHints = await buildAccountHints(accounts, pinHash)
  const importedIds = new Set(settings.smsImportedIds || [])
  const newIds = new Set(importedIds)
  let lastImportedAt = settings.smsLastImportedAt || 0

  for (const m of messages) {
    if (!m.body) continue

    if (isDuplicate(m, importedIds, transactions)) {
      result.duplicates.push({ messageId: m.id, reason: 'already-imported-or-duplicate' })
      continue
    }

    const parsed = parseSmsTransaction(m.body)
    if (!parsed) {
      if (isDeclinedTransaction(m.body)) {
        result.errors.push({ messageId: m.id, type: 'declined', message: 'Declined or failed transaction — not recorded.' })
      } else if (isBalanceInfoSms(m.body)) {
        continue
      } else if (PROMOTIONAL_RE.test(m.body)) {
        continue
      } else {
        result.errors.push({ messageId: m.id, type: 'parse-failed', message: 'Could not parse as a transaction SMS.' })
      }
      continue
    }

    const dateObj = typeof m.date === 'number' ? new Date(m.date) : new Date(m.date || Date.now())
    const date = dateObj.toISOString().slice(0, 10)
    const msgTime = dateObj.getTime()

    const sms = { body: m.body, address: m.address || '', date: dateObj.toISOString(), id: m.id }
    const matchResult = await matchSmsToAccount(sms, accounts, { pinHash })

    if (!matchResult.matched) {
      result.unmatched.push({
        messageId: m.id,
        body: m.body.slice(0, 200),
        parsed,
        date,
        reason: getAccountMatchReason(matchResult),
        matchDebug: matchResult,
        bankId: matchResult?.bankId || null,
        hint: matchResult?.hint || null,
        candidateAccountIds: matchResult?.candidates || []
      })
      newIds.add(String(m.id))
      lastImportedAt = Math.max(lastImportedAt, msgTime)
      continue
    }

    const accountId = matchResult.accountId
    const transferResult = detectTransferIntent(sms, accountId, accounts)

    if (transferResult.isTransfer && transferResult.confidence !== 'none') {
      const tx = createInternalTransferTransaction(sms, { amount: parsed.amount, accountId }, transferResult)
      tx.date = date
      tx.note = parsed.note
      tx.smsAddress = m.address || ''
      tx.smsRefNo = extractReferenceNumber(m.body) || null
      tx.smsId = m.id != null ? String(m.id) : null
      addTransaction(tx)
      newIds.add(String(m.id))
      lastImportedAt = Math.max(lastImportedAt, msgTime)
      result.imported.push({ ...m, parsed, matched: matchResult, transfer: transferResult })
      continue
    }

    const prefill = {
      accountId,
      amount: parsed.amount,
      type: parsed.type,
      date,
      note: parsed.note,
      tags: ['sms-import'],
      smsAddress: m.address || '',
      smsRefNo: extractReferenceNumber(m.body) || null,
      smsId: m.id != null ? String(m.id) : null
    }
    const categorized = autoCategorize(prefill)
    addTransaction(categorized)
    newIds.add(String(m.id))
    lastImportedAt = Math.max(lastImportedAt, msgTime)
    result.imported.push({ ...m, parsed, matched: matchResult })
  }

  updateSettings({
    smsImportedIds: Array.from(newIds).slice(-500),
    smsLastImportedAt: lastImportedAt
  })

  return result
}

export async function importSingleSmsMessage(m, store) {
  const result = await importSmsMessages([m], store)
  if (result.imported.length > 0) {
    return { success: true, transactions: result.imported, unmatched: result.unmatched, errors: result.errors }
  }
  if (result.unmatched.length > 0) {
    return { success: false, reason: 'unmatched', detail: result.unmatched[0].reason, message: `Could not match this SMS to any account. ${result.unmatched[0].reason}` }
  }
  if (result.errors.length > 0) {
    return { success: false, reason: result.errors[0].type, message: result.errors[0].message }
  }
  if (result.duplicates.length > 0) {
    return { success: false, reason: 'duplicate', message: 'This SMS has already been imported.' }
  }
  return { success: false, reason: 'unknown', message: 'Could not import this SMS.' }
}

export async function maybeAutoImportSms(store) {
  if (!isNativeSmsAvailable()) return []
  const { settings } = store
  if (!settings.smsAutoImportEnabled) return []
  const health = await checkSmsPermissionHealth()
  if (!health.healthy) return []
  const messages = await readSmsMessages()
  const result = await importSmsMessages(messages, store)
  return result.imported
}

export async function reimportUnmatchedSms(messages, store) {
  const result = { imported: [], stillUnmatched: [] }
  for (const item of messages) {
    const singleResult = await importSingleSmsMessage(item, store)
    if (singleResult.success) {
      result.imported.push(item)
    } else {
      result.stillUnmatched.push({ ...item, reason: singleResult.message })
    }
  }
  return result
}

const BANK_SENDER_IDS = [
  { pattern: /combank|commercial/i, bank: 'Commercial Bank' },
  { pattern: /sampath|vishwa/i, bank: 'Sampath Bank' },
  { pattern: /hnb|hatton/i, bank: 'HNB' },
  { pattern: /boc|ceylon/i, bank: 'Bank of Ceylon' },
  { pattern: /peoples|peo ples/i, bank: "People's Bank" },
  { pattern: /nsb|savings bank/i, bank: 'NSB' },
  { pattern: /seylan/i, bank: 'Seylan Bank' },
  { pattern: /ndb|neos/i, bank: 'NDB' },
  { pattern: /dfcc/i, bank: 'DFCC' },
  { pattern: /ntb|nations trust/i, bank: 'Nations Trust Bank' },
  { pattern: /panasia|pabc/i, bank: 'Pan Asia Bank' },
  { pattern: /union/i, bank: 'Union Bank' },
  { pattern: /cargills/i, bank: 'Cargills Bank' },
  { pattern: /sanasa|sdb/i, bank: 'Sanasa' },
  { pattern: /rdb|regional/i, bank: 'Regional Development Bank' },
  { pattern: /hsbc/i, bank: 'HSBC' },
  { pattern: /hdfc|housing/i, bank: 'HDFC' },
  { pattern: /scb|standard chartered/i, bank: 'Standard Chartered' },
  { pattern: /sbi|state bank/i, bank: 'State Bank of India' },
  { pattern: /citibank|citi/i, bank: 'Citibank' },
  { pattern: /deutsche/i, bank: 'Deutsche Bank' },
  { pattern: /habib|hbl/i, bank: 'Habib Bank' },
  { pattern: /mcb/i, bank: 'MCB Bank' },
  { pattern: /iob|indian overseas/i, bank: 'Indian Overseas Bank' },
  { pattern: /indian bank/i, bank: 'Indian Bank' },
  { pattern: /amana/i, bank: 'Amana Bank' },
  { pattern: /public bank/i, bank: 'Public Bank' },
  { pattern: /smib|mortgage/i, bank: 'State Mortgage & Investment Bank' },
  { pattern: /frimi|fri mi/i, bank: 'FriMi' },
  { pattern: /genie/i, bank: 'Genie' },
  { pattern: /dialog|ez.cash|ezcash/i, bank: 'Dialog eZ Cash' },
  { pattern: /mobitel|mcash/i, bank: 'Mobitel mCash' },
  { pattern: /hutch/i, bank: 'Hutch' },
  { pattern: /smartpay|boc.*pay/i, bank: 'BOC SmartPay' },
  { pattern: /neos|ndb.*app/i, bank: 'NDB Neos' },
  { pattern: /paynet|payhere/i, bank: 'Digital Wallet' }
]

function detectBankName(text) {
  if (!text) return null
  const lower = text.toLowerCase()
  for (const entry of BANK_SENDER_IDS) {
    if (entry.pattern.test(lower)) return entry.bank
  }
  return null
}

function resolveBankId(bankName, sender) {
  // Try sender-ID lookup first (most precise), then name lookup.
  if (sender) {
    const bySender = findBankBySenderId(sender)
    if (bySender) return bySender.id
  }
  if (bankName) {
    const byName = findBankByName(bankName)
    if (byName) return byName.id
  }
  return null
}

function extractSmsAccountHint(text) {
  if (!text) return null
  const patterns = [
    /\b(?:a\/c|ac|a\/c\.|acc|account|card)[\s:#-]*([*x]{2,4}\d{3,4}|\d{3,4})/i,
    /\b(?:ending|ending in|last)\s+(\d{4})\b/i,
    /\b([*x]{4}\d{4})\b/i,
    /\b(\d{4})\s*(?:is your|as your)\b/i
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[1].replace(/[*x]/g, '')
  }
  return null
}

export async function suggestAccountsFromSms(limit = 100) {
  if (!isNativeSmsAvailable()) return []

  const granted = await requestSmsPermission()
  if (!granted) return []

  const messages = await readSmsMessages()
  const candidates = new Map()

  for (const m of messages.slice(0, limit)) {
    if (!m.body) continue
    if (PROMOTIONAL_RE.test(m.body)) continue
    if (!BANK_ALERT_RE.test(m.body)) continue

    const bank = detectBankName(m.body) || detectBankName(m.address || '')
    const hint = extractSmsAccountHint(m.body)
    const sender = m.address || 'Unknown'

    if (!bank && !hint) continue

    const key = `${bank || 'Unknown'}_${hint || 'nohint'}`
    if (!candidates.has(key)) {
      candidates.set(key, { bank, hint, sender, count: 0, examples: [] })
    }
    const c = candidates.get(key)
    c.count++
    if (c.examples.length < 2) c.examples.push(m.body.slice(0, 120))
  }

  return Array.from(candidates.entries())
    .sort(([, a], [, b]) => {
      const aScore = (a.bank ? 10 : 0) + (a.hint ? 5 : 0) + a.count
      const bScore = (b.bank ? 10 : 0) + (b.hint ? 5 : 0) + b.count
      return bScore - aScore
    })
    .slice(0, 10)
    .map(([key, data]) => ({
      id: key,
      bank: data.bank,
      bankId: resolveBankId(data.bank, data.sender),
      hint: data.hint,
      sender: data.sender,
      count: data.count,
      examples: data.examples,
      suggestedName: data.bank
        ? (data.hint ? `${formatBankName(data.bank)} ****${data.hint}` : formatBankName(data.bank))
        : (data.hint ? `Card ****${data.hint}` : 'Unknown Account'),
      type: inferAccountType(data.bank)
    }))
}

function formatBankName(bank) {
  const map = {
    'Commercial Bank': 'Commercial Bank',
    'Sampath Bank': 'Sampath Bank',
    'HNB': 'HNB',
    "People's Bank": "People's Bank",
    'Bank of Ceylon': 'Bank of Ceylon',
    'NSB': 'NSB',
    'Seylan Bank': 'Seylan Bank',
    'NDB': 'NDB',
    'DFCC': 'DFCC',
    'Nations Trust Bank': 'Nations Trust Bank',
    'Pan Asia Bank': 'Pan Asia Bank',
    'Union Bank': 'Union Bank',
    'Cargills Bank': 'Cargills Bank',
    'Sanasa': 'Sanasa',
    'Regional Development Bank': 'RDB',
    'HSBC': 'HSBC',
    'HDFC': 'HDFC',
    'Standard Chartered': 'Standard Chartered',
    'State Bank of India': 'State Bank of India',
    'Citibank': 'Citibank',
    'Deutsche Bank': 'Deutsche Bank',
    'Habib Bank': 'Habib Bank',
    'MCB Bank': 'MCB Bank',
    'Indian Overseas Bank': 'Indian Overseas Bank',
    'Indian Bank': 'Indian Bank',
    'Amana Bank': 'Amana Bank',
    'Public Bank': 'Public Bank',
    'State Mortgage & Investment Bank': 'SMIB',
    'FriMi': 'FriMi',
    'Genie': 'Genie',
    'Dialog eZ Cash': 'Dialog eZ Cash',
    'Mobitel mCash': 'Mobitel mCash',
    'Hutch': 'Hutch',
    'BOC SmartPay': 'BOC SmartPay',
    'NDB Neos': 'NDB Neos',
    'Digital Wallet': 'Digital Wallet'
  }
  return map[bank] || bank
}

function inferAccountType(bank) {
  if (!bank) return 'wallet'
  const lower = bank.toLowerCase()
  if (lower.includes('frimi') || lower.includes('genie') || lower.includes('ez cash') || lower.includes('mcash') || lower.includes('hutch') || lower.includes('smartpay') || lower.includes('neos')) return 'wallet'
  if (lower.includes('credit') || lower.includes('visa') || lower.includes('mastercard') || lower.includes('amex')) return 'credit'
  return 'bank'
}
