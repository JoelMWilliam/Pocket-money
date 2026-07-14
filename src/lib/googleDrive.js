import { SocialLogin } from '@capgo/capacitor-social-login'
import { Capacitor } from '@capacitor/core'
import { inlineReceipts } from './receipts'
import { storageGet, storageSet, storageRemove } from './storage'

const BACKUP_FILE_NAME = 'pocket-money-backup.json'
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
const AUTH_KEY = 'pm-google-drive-auth'

function getGoogleWebClientId() {
  const fromEnv = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID
  if (fromEnv) return fromEnv
  const cfg = Capacitor.getConfig()
  const fromCapacitor = cfg?.plugins?.SocialLogin?.google?.webClientId
  if (fromCapacitor && !fromCapacitor.includes('YOUR_WEB_CLIENT_ID')) {
    return fromCapacitor
  }
  return ''
}

const GOOGLE_WEB_CLIENT_ID = getGoogleWebClientId()

export function getStoredAuth() {
  return storageGet(AUTH_KEY, null)
}

export function setStoredAuth(auth) {
  return storageSet(AUTH_KEY, auth)
}

export function clearStoredAuth() {
  return storageRemove(AUTH_KEY)
}

export function isGoogleDriveConfigured() {
  return Boolean(GOOGLE_WEB_CLIENT_ID)
}

export async function initializeGoogleAuth() {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error('Google Drive is not configured. Set VITE_GOOGLE_WEB_CLIENT_ID in your environment.')
  }
  await SocialLogin.initialize({
    google: {
      webClientId: GOOGLE_WEB_CLIENT_ID,
      mode: 'online'
    }
  })
}

export async function signInToGoogleDrive() {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error('Google Drive is not configured. Set VITE_GOOGLE_WEB_CLIENT_ID in your environment.')
  }
  try {
    await initializeGoogleAuth()
  } catch (err) {
    // Already initialized or config error; continue and let login fail if real problem
    console.log('Google auth init (already initialized?):', err?.message || err)
  }
  const res = await SocialLogin.login({
    provider: 'google',
    options: {
      scopes: ['email', 'profile', DRIVE_SCOPE]
    }
  })
  console.log('Google login result:', JSON.stringify(res, null, 2))
  const profile = res?.result?.profile || {}
  const email = profile.email || ''
  const accessToken =
    res?.result?.accessToken?.token ||
    res?.result?.idToken?.token ||
    res?.result?.accessToken ||
    res?.result?.idToken ||
    ''
  if (!email && !accessToken) {
    throw new Error('Google sign-in did not return a profile or token.')
  }
  const auth = {
    email,
    accessToken,
    expiresAt: res?.result?.accessToken?.expires
      ? new Date(res.result.accessToken.expires).getTime()
      : undefined
  }
  await setStoredAuth(auth)
  return auth
}

export async function getValidAccessToken() {
  const auth = await getStoredAuth()
  if (!auth) {
    throw new Error('Not signed in to Google Drive.')
  }
  const expired = auth.expiresAt && auth.expiresAt < Date.now() + 60_000
  if (!expired) {
    return auth.accessToken
  }
  try {
    const refreshed = await SocialLogin.refresh({
      provider: 'google',
      options: { scopes: [DRIVE_SCOPE] }
    })
    const token = refreshed?.result?.accessToken?.token
    if (token) {
      auth.accessToken = token
      auth.expiresAt = refreshed.result.accessToken.expires
        ? new Date(refreshed.result.accessToken.expires).getTime()
        : undefined
      await setStoredAuth(auth)
      return token
    }
  } catch (err) {
    // Refresh failed; fall through to re-login
  }
  const loginRes = await signInToGoogleDrive()
  return loginRes.accessToken
}

export async function uploadBackupToDrive(data) {
  const token = await getValidAccessToken()
  const withReceipts = await inlineReceipts(data)
  const payload = JSON.stringify(withReceipts, null, 2)
  const existing = await findBackupFile(token)
  if (existing) {
    await updateBackupFile(token, existing.id, payload)
    return { id: existing.id, created: false }
  }
  const created = await createBackupFile(token, payload)
  return { id: created.id, created: true }
}

export async function downloadBackupFromDrive() {
  const token = await getValidAccessToken()
  const file = await findBackupFile(token)
  if (!file) {
    throw new Error('No Pocket Money backup found in Google Drive.')
  }
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) {
    throw new Error('Failed to download backup from Google Drive.')
  }
  return res.json()
}

export async function signOutFromGoogleDrive() {
  try {
    await SocialLogin.logout({ provider: 'google' })
  } catch (err) {
    // Ignore logout errors
  }
  await clearStoredAuth()
}

async function findBackupFile(token) {
  const q = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and trashed=false and mimeType='application/json'`)
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error?.error?.message || 'Failed to search Google Drive.')
  }
  const data = await res.json()
  return data.files?.[0] || null
}

async function createBackupFile(token, payload) {
  const boundary = 'pocket_money_boundary'
  const metadata = JSON.stringify({ name: BACKUP_FILE_NAME, mimeType: 'application/json' })
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    `${payload}\r\n` +
    `--${boundary}--`
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error?.error?.message || 'Failed to create backup in Google Drive.')
  }
  return res.json()
}

async function updateBackupFile(token, fileId, payload) {
  const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: payload
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error?.error?.message || 'Failed to update backup in Google Drive.')
  }
  return res.json()
}
