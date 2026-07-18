import { decryptAccountNumber, getLast4Digits, getFirst4Digits } from './accountNumber'
import { findBankBySenderId, findBankByName, getBankById, BANKS } from './banks'

const FRAGMENT_PATTERNS = [
  /ending\s*[:\s]*(\d{3,4})/i,
  /xx\s*(\d{3,4})/i,
  /a\/c\s*(?:no\.?)?\s*[\*x]*(\d{3,4})/i,
  /account\s*(?:no\.?)?\s*[\*x]*(\d{3,4})/i,
  /card\s*(?:no\.?)?\s*[\*x]*(\d{3,4})/i,
  /debited\s+(?:from|to).*?(?:ac|account|card).*?[\*x*\s]*(\d{3,4})/i,
  /credited\s+(?:from|to|to\s+your).*?(?:ac|account|card).*?[\*x*\s]*(\d{3,4})/i,
  /(?:ac|account|card)\s*(?:no\.?)?\s*[\*x]*(\d{3,4})/i
]

const REASON_DESCRIPTIONS = {
  'account-fragment-matched': 'Account number fragment matched a stored account.',
  'fragment-not-matched': 'Account number fragment found but did not match any stored account.',
  'sender-bank-single-account': 'Sender ID matched a bank and only one account is linked to it.',
  'account-name-matched-bank': 'Sender\'s bank matches the bank name in this account\'s name.',
  'ambiguous-bank-multiple-accounts': 'Sender ID matched a bank, but multiple accounts are linked to it.',
  'bank-no-matching-account': 'Sender ID matched a bank, but no account is linked to it.',
  'unknown-institution': 'Could not identify the bank or institution from this SMS.'
}

export function extractAccountFragment(text) {
  if (!text) return null
  for (const re of FRAGMENT_PATTERNS) {
    const m = text.match(re)
    if (m) return m[1]
  }
  return null
}

export async function buildAccountHints(accounts, pinHash) {
  if (!accounts || !accounts.length) return []
  const hints = []
  for (const a of accounts) {
    if (a.accountNumberHint && typeof a.accountNumberHint === 'object') {
      hints.push({
        id: a.id,
        bankId: a.bankId || null,
        last4: a.accountNumberHint.last4 || null,
        first4: a.accountNumberHint.first4 || null,
        name: a.name || ''
      })
      continue
    }
    let number = null
    if (a.accountNumberEncrypted && pinHash) {
      try {
        number = await decryptAccountNumber(a.accountNumberEncrypted, pinHash)
      } catch (e) {
        number = null
      }
    }
    if (!number && a.accountNumberHint) {
      number = a.accountNumberHint
    }
    hints.push({
      id: a.id,
      bankId: a.bankId || null,
      last4: number ? getLast4Digits(number) : null,
      first4: number ? getFirst4Digits(number) : null,
      name: a.name || ''
    })
  }
  return hints
}

// Resolve bank for an account that has no explicit bankId set, using its name.
export function inferAccountBankId(account) {
  if (account?.bankId) return account.bankId
  if (!account?.name) return null
  const bank = findBankByName(account.name)
  return bank?.id || null
}

// Tokenize an account name and check whether a bank's shortNames/aliases appear
// as tokens in it (e.g. "Commercial Bank ****1234" → commercial-bank).
function accountMatchesBankByName(account, bank) {
  if (!account?.name) return false
  const haystacks = [bank.name, ...bank.shortNames, ...bank.aliases, ...bank.senderIds]
  const haystackTokens = haystacks.flatMap((h) => tokenize(h))
  const fieldName = String(account.name).toUpperCase()
  for (const t of haystackTokens) {
    if (t.length < 3) continue
    if (fieldName.includes(t)) return true
  }
  return false
}

function tokenize(text) {
  return String(text).toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean)
}

// Match SMS to a single account.
export async function matchSmsToAccount(sms, accounts, options = {}) {
  const base = {
    matched: false,
    accountId: null,
    confidence: null,
    matchType: 'none',
    reason: null,
    bankId: null,
    hint: null,
    candidates: []
  }

  const body = sms?.body || ''
  const address = sms?.address || ''

  const fragment = extractAccountFragment(body)
  const bank = findBankBySenderId(address) || findBankByName(address) || findBankByName(body)

  const hints = await buildAccountHints(accounts || [], options.pinHash)

  // 1) Fragment (last-4) match — highest confidence. If an SMS contains an
  //    account-number fragment, look for an account whose last-4 (or first-4)
  //    matches. If we find exactly one, return it as high-confidence match.
  if (fragment) {
    const matches = hints.filter((h) => h.last4 === fragment || h.first4 === fragment)
    if (matches.length === 1) {
      return {
        ...base,
        matched: true,
        accountId: matches[0].id,
        confidence: 'high',
        matchType: 'fragment',
        reason: 'account-fragment-matched',
        bankId: matches[0].bankId,
        hint: fragment
      }
    }
    // Multiple accounts share the same last-4: ambiguous — but if the sender
    // bank is identified, prefer fragment matches whose bank matches the sender.
    if (matches.length > 1 && bank) {
      const narrowed = matches.filter((m) => m.bankId === bank.id)
      if (narrowed.length === 1) {
        return {
          ...base,
          matched: true,
          accountId: narrowed[0].id,
          confidence: 'high',
          matchType: 'fragment+sender',
          reason: 'account-fragment-matched',
          bankId: bank.id,
          hint: fragment
        }
      }
    }
    // Fall through — fragment didn't uniquely match. Try sender bank.
  }

  // 2) Sender-bank match.
  if (bank) {
    // Prefer accounts that explicitly link to this bank via bankId.
    const explicit = (accounts || []).filter((a) => a.bankId === bank.id)

    // If no explicit link by bankId, try inferring bank via account name
    // (covers accounts created without bankId — the typical onboarding case).
    const inferredCandidates = (accounts || []).filter((a) => !a.bankId && accountMatchesBankByName(a, bank))

    const candidates = [...explicit, ...inferredCandidates.filter((a) => !explicit.some((e) => e.id === a.id))]

    const uniqueCandidates = Array.from(new Map(candidates.map((c) => [c.id, c])).values())

    if (uniqueCandidates.length === 1) {
      return {
        ...base,
        matched: true,
        accountId: uniqueCandidates[0].id,
        confidence: explicit.length === 1 ? 'medium' : 'medium' /* still medium; inferred match is name-based */,
        matchType: explicit.length === 1 ? 'sender' : 'name',
        reason: explicit.length === 1 ? 'sender-bank-single-account' : 'account-name-matched-bank',
        bankId: bank.id,
        candidates: uniqueCandidates.map((c) => c.id)
      }
    }
    if (uniqueCandidates.length > 1) {
      // Multiple candidates for this bank — don't guess. Caller surfaces as unmatched.
      return {
        ...base,
        confidence: 'low',
        reason: 'ambiguous-bank-multiple-accounts',
        bankId: bank.id,
        candidates: uniqueCandidates.map((c) => c.id)
      }
    }

    // No candidates resolved (bank detected, but no account links to it yet).
    return {
      ...base,
      reason: 'bank-no-matching-account',
      bankId: bank.id,
      hint: fragment
    }
  }

  // 3) Unknown institution + fragment — caller surfaces unmatched.
  return {
    ...base,
    reason: fragment ? 'fragment-not-matched' : 'unknown-institution',
    hint: fragment
  }
}

export function getAccountMatchReason(match) {
  if (!match || !match.reason) return 'No match information available.'
  return REASON_DESCRIPTIONS[match.reason] || match.reason
}