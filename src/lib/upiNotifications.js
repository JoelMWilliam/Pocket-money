import { registerPlugin, Capacitor } from '@capacitor/core'

const NotificationListener = registerPlugin('NotificationListener')

const UPI_PATTERNS = [
  { regex: /(?:paid|sent)\s+(?:rs\.?|lkr|₹|₨)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:to|via|to\s+\w+)/i, type: 'expense' },
  { regex: /(?:received|got|credited)\s+(?:rs\.?|lkr|₹|₨)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:from|via)/i, type: 'income' },
  { regex: /(?:rs\.?|lkr|₹|₨)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:paid|sent|debited)/i, type: 'expense' },
  { regex: /(?:rs\.?|lkr|₹|₨)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:received|credited)/i, type: 'income' },
  { regex: /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:paid|sent|debited)/i, type: 'expense' },
  { regex: /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:received|credited)/i, type: 'income' },
]

const MERCHANT_EXTRACTORS = [
  /(?:to|paid to|sent to)\s+([A-Za-z0-9\s&'-]{3,30})/i,
  /(?:from|received from|credited from)\s+([A-Za-z0-9\s&'-]{3,30})/i,
  /(?:at|to|via)\s+([A-Za-z0-9\s&'-]{3,30})/i,
]

export function parsePaymentNotification(title, text) {
  const fullText = `${title || ''} ${text || ''}`
  if (!fullText.trim()) return null

  for (const pattern of UPI_PATTERNS) {
    const match = fullText.match(pattern.regex)
    if (match) {
      const amount = Number(match[1].replace(/,/g, ''))
      if (!amount || amount <= 0) continue

      let merchant = ''
      for (const extractor of MERCHANT_EXTRACTORS) {
        const m = fullText.match(extractor)
        if (m) {
          merchant = m[1].trim().replace(/\s+/g, ' ')
          break
        }
      }
      if (!merchant) merchant = title || 'UPI Payment'

      return {
        amount,
        type: pattern.type,
        note: merchant,
        merchant,
        source: 'upi-notification',
        date: new Date().toISOString().slice(0, 10),
        confidence: 0.8
      }
    }
  }

  return null
}

export async function checkNotificationPermission() {
  if (!Capacitor.isNativePlatform()) return false
  try {
    const result = await NotificationListener.getPermissionStatus()
    return result.granted
  } catch {
    return false
  }
}

export async function requestNotificationListenerPermission() {
  if (!Capacitor.isNativePlatform()) return false
  try {
    await NotificationListener.requestPermission()
    return true
  } catch {
    return false
  }
}

export async function getPaymentNotifications() {
  if (!Capacitor.isNativePlatform()) return []
  try {
    const result = await NotificationListener.getPendingNotifications()
    const notifications = result.notifications || []
    const parsed = []
    for (const n of notifications) {
      const txn = parsePaymentNotification(n.title, n.text)
      if (txn) {
        txn.timestamp = n.time
        txn.date = new Date(n.time).toISOString().slice(0, 10)
        parsed.push(txn)
      }
    }
    return parsed
  } catch {
    return []
  }
}

export async function clearNotificationBuffer() {
  if (!Capacitor.isNativePlatform()) return
  try {
    await NotificationListener.clearNotifications()
  } catch {
    // ignore
  }
}

export async function importPaymentNotifications(store) {
  const { transactions, addTransaction, settings, updateSettings } = store

  const notifications = await getPaymentNotifications()
  if (notifications.length === 0) return { imported: 0 }

  const { deduplicateTransactions } = await import('./dedup')
  const { autoCategorize } = await import('./merchantRules')

  const { unique } = deduplicateTransactions(notifications, transactions)

  let count = 0
  for (const txn of unique) {
    const categorized = autoCategorize(txn)
    addTransaction({
      ...categorized,
      tags: ['upi-import']
    })
    count++
  }

  await clearNotificationBuffer()

  return { imported: count, total: notifications.length }
}
