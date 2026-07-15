import { Capacitor } from '@capacitor/core'
import { importSmsMessages, readSmsMessages, requestSmsPermission } from './sms'
import { syncEmailsToTransactions, isEmailSyncConfigured } from './gmailSync'
import { importPaymentNotifications, getPaymentNotifications } from './upiNotifications'
import { autoCategorize } from './merchantRules'
import { deduplicateTransactions } from './dedup'

export async function runAutoCapturePipeline(store) {
  const results = {
    sms: { imported: 0, error: null },
    email: { imported: 0, error: null },
    upi: { imported: 0, error: null },
    total: 0
  }

  if (!Capacitor.isNativePlatform()) return results

  try {
    const { settings } = store
    if (settings.smsAutoImportEnabled !== false) {
      try {
        const granted = await requestSmsPermission()
        if (granted) {
          const messages = await readSmsMessages()
          const imported = await importSmsMessages(messages, store)
          results.sms.imported = imported.length
        }
      } catch (err) {
        results.sms.error = err.message
      }
    }

    if (isEmailSyncConfigured()) {
      try {
        const result = await syncEmailsToTransactions(store)
        results.email.imported = result.imported || 0
        if (result.error) results.email.error = result.error
      } catch (err) {
        results.email.error = err.message
      }
    }

    try {
      const result = await importPaymentNotifications(store)
      results.upi.imported = result.imported || 0
    } catch (err) {
      results.upi.error = err.message
    }

    results.total = results.sms.imported + results.email.imported + results.upi.imported
  } catch (err) {
    console.error('Auto-capture pipeline error:', err)
  }

  return results
}

export async function getAvailableSources(store) {
  const sources = []

  sources.push({
    id: 'sms',
    name: 'Bank SMS',
    enabled: true,
    description: 'Automatically import bank transaction alerts'
  })

  if (isEmailSyncConfigured()) {
    sources.push({
      id: 'email',
      name: 'Email Receipts',
      enabled: true,
      description: 'Parse transactional emails from Amazon, Uber, etc.'
    })
  }

  sources.push({
    id: 'upi',
    name: 'UPI Notifications',
    enabled: true,
    description: 'Capture Google Pay, PhonePe, Paytm payments'
  })

  sources.push({
    id: 'receipt',
    name: 'Receipt Scanner',
    enabled: true,
    description: 'Use camera to scan receipts and extract amounts'
  })

  return sources
}
