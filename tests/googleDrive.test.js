import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

vi.mock('@capgo/capacitor-social-login', () => ({
  SocialLogin: {
    initialize: vi.fn(() => Promise.resolve()),
    login: vi.fn(() => Promise.resolve({
      result: {
        profile: { email: 'backup@test.com' },
        accessToken: { token: 'drive-token', expires: new Date(Date.now() + 3600000).toISOString() }
      }
    })),
    logout: vi.fn(() => Promise.resolve()),
    refresh: vi.fn(() => Promise.resolve({
      result: {
        accessToken: { token: 'refreshed-token', expires: new Date(Date.now() + 3600000).toISOString() }
      }
    }))
  }
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, getConfig: () => ({}) },
  registerPlugin: vi.fn(() => ({}))
}))

vi.mock('../src/lib/receipts', () => ({
  inlineReceipts: vi.fn((data) => Promise.resolve(data))
}))

const _testStorage = {}
vi.mock('../src/lib/storage', () => ({
  storageGet: vi.fn((key, fallback = null) => {
    const v = _testStorage[key]
    return v !== undefined ? v : fallback
  }),
  storageSet: vi.fn((key, value) => { _testStorage[key] = value }),
  storageRemove: vi.fn((key) => { delete _testStorage[key] })
}))

let googleDrive

beforeAll(async () => {
  vi.stubEnv('VITE_GOOGLE_WEB_CLIENT_ID', 'test-id')
  vi.resetModules()
  googleDrive = await import('../src/lib/googleDrive')
  vi.unstubAllEnvs()
})

beforeEach(() => {
  vi.clearAllMocks()
  Object.keys(_testStorage).forEach((k) => delete _testStorage[k])
})

describe('isGoogleDriveConfigured', () => {
  it('returns true when client ID is set', () => {
    expect(googleDrive.isGoogleDriveConfigured()).toBe(true)
  })
})

describe('signInToGoogleDrive', () => {
  it('returns auth with email and accessToken when configured', async () => {
    const auth = await googleDrive.signInToGoogleDrive()
    expect(auth).toEqual({
      email: 'backup@test.com',
      accessToken: 'drive-token',
      expiresAt: expect.any(Number)
    })
  })
})

describe('getValidAccessToken', () => {
  it('returns stored token when not expired', async () => {
    await googleDrive.setStoredAuth({
      email: 'backup@test.com',
      accessToken: 'stored-token',
      expiresAt: Date.now() + 3600000
    })

    const token = await googleDrive.getValidAccessToken()
    expect(token).toBe('stored-token')
  })

  it('refreshes token when expired', async () => {
    await googleDrive.setStoredAuth({
      email: 'backup@test.com',
      accessToken: 'stale-token',
      expiresAt: Date.now() - 3600000
    })

    const token = await googleDrive.getValidAccessToken()
    expect(token).toBe('refreshed-token')
  })
})

describe('uploadBackupToDrive', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  it('creates a new backup file when none exists', async () => {
    await googleDrive.setStoredAuth({
      email: 'backup@test.com',
      accessToken: 'drive-token',
      expiresAt: Date.now() + 3600000
    })

    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'new-file-id' })
      })

    const result = await googleDrive.uploadBackupToDrive({
      transactions: [],
      settings: {}
    })
    expect(result).toEqual({ id: 'new-file-id', created: true })
  })

  it('updates an existing backup file when one exists', async () => {
    await googleDrive.setStoredAuth({
      email: 'backup@test.com',
      accessToken: 'drive-token',
      expiresAt: Date.now() + 3600000
    })

    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          files: [{ id: 'existing-id', name: 'pocket-money-backup.json' }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'existing-id' })
      })

    const result = await googleDrive.uploadBackupToDrive({
      transactions: [],
      settings: {}
    })
    expect(result).toEqual({ id: 'existing-id', created: false })
  })
})

describe('downloadBackupFromDrive', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  it('throws when no backup found', async () => {
    await googleDrive.setStoredAuth({
      email: 'backup@test.com',
      accessToken: 'drive-token',
      expiresAt: Date.now() + 3600000
    })

    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ files: [] })
    })

    await expect(googleDrive.downloadBackupFromDrive()).rejects.toThrow(
      'No Pocket Money backup found in Google Drive'
    )
  })
})

describe('signOutFromGoogleDrive', () => {
  it('clears stored auth', async () => {
    await googleDrive.setStoredAuth({
      email: 'backup@test.com',
      accessToken: 'drive-token'
    })

    const before = await googleDrive.getStoredAuth()
    expect(before).not.toBeNull()

    await googleDrive.signOutFromGoogleDrive()

    const after = await googleDrive.getStoredAuth()
    expect(after).toBeNull()
  })
})

describe('isGoogleDriveConfigured without client ID', () => {
  it('returns false when no web client ID is set', async () => {
    vi.stubEnv('VITE_GOOGLE_WEB_CLIENT_ID', '')
    vi.resetModules()
    const mod = await import('../src/lib/googleDrive')
    expect(mod.isGoogleDriveConfigured()).toBe(false)
    vi.unstubAllEnvs()
  })
})

describe('signInToGoogleDrive without client ID', () => {
  it('throws when no web client ID', async () => {
    vi.stubEnv('VITE_GOOGLE_WEB_CLIENT_ID', '')
    vi.resetModules()
    const mod = await import('../src/lib/googleDrive')
    await expect(mod.signInToGoogleDrive()).rejects.toThrow('Google Drive is not configured')
    vi.unstubAllEnvs()
  })
})
