import { Capacitor } from '@capacitor/core'
import { SocialLogin } from '@capgo/capacitor-social-login'

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email'
]

const IS_NATIVE = Capacitor.isNativePlatform()

let cachedAccessToken = null
let cachedEmail = null

export function isEmailSyncConfigured() {
  return !!cachedAccessToken
}

export async function initializeGmailAuth() {
  if (!IS_NATIVE) return
  try {
    const result = await SocialLogin.initialize({
      google: {
        webClientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID,
        scopes: GMAIL_SCOPES
      }
    })
    return result
  } catch (err) {
    console.error('Gmail auth init failed:', err)
  }
}

export async function connectGmail() {
  if (!IS_NATIVE) {
    throw new Error('Email sync requires the mobile app.')
  }

  try {
    const result = await SocialLogin.login({
      provider: 'google',
      options: {
        scopes: GMAIL_SCOPES
      }
    })

    if (!result?.result?.accessToken) {
      throw new Error('No access token received from Google.')
    }

    cachedAccessToken = result.result.accessToken
    cachedEmail = result.result.email || result.result.userId

    return {
      accessToken: cachedAccessToken,
      email: cachedEmail
    }
  } catch (err) {
    throw new Error('Gmail connection failed: ' + (err.message || 'unknown error'))
  }
}

export async function disconnectGmail() {
  try {
    await SocialLogin.logout({ provider: 'google' })
  } catch (err) {
    console.warn('Gmail logout error:', err)
  }
  cachedAccessToken = null
  cachedEmail = null
}

export async function fetchTransactionEmails(maxResults = 50) {
  if (!cachedAccessToken) {
    throw new Error('Gmail not connected. Call connectGmail() first.')
  }

  try {
    const searchQuery = encodeURIComponent(
      '(subject:order OR subject:receipt OR subject:invoice OR subject:payment OR subject:charged OR subject:debited OR subject:transaction OR subject:statement) -subject:unsubscribe -subject:promo -subject:offer -subject:newsletter newer_than:7d'
    )

    const listUrl = `https://www.googleapis.com/gmail/v1/users/me/messages?q=${searchQuery}&maxResults=${maxResults}`
    const listResponse = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${cachedAccessToken}` }
    })

    if (!listResponse.ok) {
      throw new Error(`Gmail API error: ${listResponse.status}`)
    }

    const listData = await listResponse.json()
    if (!listData.messages) return []

    const emails = []
    for (const msg of listData.messages.slice(0, maxResults)) {
      const msgUrl = `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`
      const msgResponse = await fetch(msgUrl, {
        headers: { Authorization: `Bearer ${cachedAccessToken}` }
      })

      if (!msgResponse.ok) continue
      const msgData = await msgResponse.json()

      const headers = msgData.payload?.headers || []
      const sender = headers.find((h) => h.name === 'From')?.value || ''
      const subject = headers.find((h) => h.name === 'Subject')?.value || ''
      const dateHeader = headers.find((h) => h.name === 'Date')?.value || ''

      let body = ''
      if (msgData.payload?.body?.data) {
        body = atob(msgData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'))
      } else if (msgData.payload?.parts) {
        const textPart = msgData.payload.parts.find((p) => p.mimeType === 'text/plain')
        if (textPart?.body?.data) {
          body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'))
        }
      }

      emails.push({ id: msg.id, sender, subject, body, dateReceived: dateHeader })
    }

    return emails
  } catch (err) {
    console.error('Failed to fetch emails:', err)
    throw err
  }
}

export async function syncEmailsToTransactions(store) {
  const { addTransaction, settings, updateSettings, transactions } = store

  try {
    const emails = await fetchTransactionEmails(50)
    const { parseEmailBatch } = await import('./emailParser')
    const parsed = parseEmailBatch(emails)

    const { deduplicateTransactions } = await import('./dedup')
    const { autoCategorize } = await import('./merchantRules')

    const { unique } = deduplicateTransactions(parsed, transactions)

    const importedIds = new Set(settings.emailImportedIds || [])
    let count = 0

    for (const txn of unique) {
      if (importedIds.has(txn.sourceDetails?.orderNumber || txn.date + txn.amount)) continue
      const categorized = autoCategorize(txn)
      addTransaction({
        ...categorized,
        tags: ['email-import']
      })
      importedIds.add(txn.sourceDetails?.orderNumber || txn.date + txn.amount)
      count++
    }

    updateSettings({
      emailImportedIds: Array.from(importedIds).slice(-500),
      emailLastImportedAt: Date.now()
    })

    return { imported: count, total: parsed.length }
  } catch (err) {
    console.error('Email sync failed:', err)
    return { imported: 0, error: err.message }
  }
}
