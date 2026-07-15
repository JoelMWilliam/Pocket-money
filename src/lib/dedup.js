import { matchMerchant } from './merchantRules'

const AMOUNT_TOLERANCE = 0.02
const DATE_TOLERANCE_HOURS = 24

export function generateTransactionFingerprint(txn) {
  const amount = Number(txn.amount) || 0
  const dateStr = (txn.date || '').slice(0, 10)
  const merchantMatch = matchMerchant([txn.note, txn.merchant].filter(Boolean).join(' '))
  const merchantName = merchantMatch?.merchant || txn.note || txn.merchant || ''
  const normalizedMerchant = merchantName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)
  return `${amount.toFixed(2)}|${dateStr}|${normalizedMerchant}`
}

export function areTransactionsSimilar(a, b) {
  const amountA = Number(a.amount) || 0
  const amountB = Number(b.amount) || 0
  const amountDiff = Math.abs(amountA - amountB)
  const withinAmount = amountDiff <= Math.max(amountA * AMOUNT_TOLERANCE, 1)

  if (!withinAmount) return false

  const dateA = new Date(a.date || Date.now())
  const dateB = new Date(b.date || Date.now())
  const hoursDiff = Math.abs(dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60)
  const withinDate = hoursDiff <= DATE_TOLERANCE_HOURS

  if (!withinDate) return false

  const merchantA = matchMerchant([a.note, a.merchant].filter(Boolean).join(' '))
  const merchantB = matchMerchant([b.note, b.merchant].filter(Boolean).join(' '))
  if (merchantA && merchantB) {
    return merchantA.merchant === merchantB.merchant
  }

  const noteA = (a.note || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const noteB = (b.note || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  if (noteA.length > 3 && noteB.length > 3) {
    return noteA.includes(noteB) || noteB.includes(noteA) || levenshtein(noteA, noteB) <= 3
  }

  return true
}

export function findDuplicates(newTxn, existingTxns) {
  return existingTxns.filter((existing) => areTransactionsSimilar(newTxn, existing))
}

export function deduplicateTransactions(newTxns, existingTxns) {
  const result = []
  const seen = new Set()

  for (const txn of newTxns) {
    const dups = findDuplicates(txn, existingTxns)
    if (dups.length === 0) {
      const internalDups = findDuplicates(txn, result)
      if (internalDups.length === 0) {
        result.push(txn)
      } else {
        seen.add(generateTransactionFingerprint(txn))
      }
    } else {
      seen.add(generateTransactionFingerprint(txn))
    }
  }

  return { unique: result, duplicates: seen.size }
}

function levenshtein(a, b) {
  const matrix = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
      }
    }
  }
  return matrix[b.length][a.length]
}

export function mergeDuplicateSources(transactions) {
  const merged = []
  const fingerprints = new Map()

  for (const txn of transactions) {
    const fp = generateTransactionFingerprint(txn)
    if (fingerprints.has(fp)) {
      const existing = merged[fingerprints.get(fp)]
      existing.sources = Array.from(new Set([...(existing.sources || [existing.source]), ...(txn.sources || [txn.source])]))
      existing.confidence = Math.max(existing.confidence || 0.5, txn.confidence || 0.5)
    } else {
      fingerprints.set(fp, merged.length)
      merged.push({ ...txn, sources: [txn.source].filter(Boolean) })
    }
  }

  return merged
}
