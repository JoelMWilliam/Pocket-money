import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockStore = {}

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(({ key }) => Promise.resolve({ value: mockStore[key] ?? null })),
    set: vi.fn(({ key, value }) => { mockStore[key] = value; return Promise.resolve() }),
    remove: vi.fn(({ key }) => { delete mockStore[key]; return Promise.resolve() }),
    keys: vi.fn(() => Promise.resolve({ keys: Object.keys(mockStore) })),
    clear: vi.fn(() => { Object.keys(mockStore).forEach((k) => delete mockStore[k]); return Promise.resolve() })
  }
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false }
}))

import {
  zustandStorage,
  storageSet,
  storageGet,
  storageRemove,
  storageKeys,
  storageClear
} from '../src/lib/storage'

describe('zustandStorage (web)', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
    localStorage.clear()
  })

  it('getItem returns null for missing key', async () => {
    const val = await zustandStorage.getItem('nonexistent')
    expect(val).toBeNull()
  })

  it('setItem and getItem round-trip', async () => {
    await zustandStorage.setItem('test-key', '{"a":1}')
    const val = await zustandStorage.getItem('test-key')
    expect(val).toBe('{"a":1}')
  })

  it('removeItem deletes key', async () => {
    await zustandStorage.setItem('temp', 'value')
    await zustandStorage.removeItem('temp')
    expect(await zustandStorage.getItem('temp')).toBeNull()
  })
})

describe('storageSet / storageGet (web)', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
    localStorage.clear()
  })

  it('serializes and deserializes objects', async () => {
    await storageSet('user', { name: 'Alice', age: 30 })
    const val = await storageGet('user')
    expect(val).toEqual({ name: 'Alice', age: 30 })
  })

  it('returns fallback for missing key', async () => {
    const val = await storageGet('missing', { fallback: true })
    expect(val).toEqual({ fallback: true })
  })

  it('returns fallback for malformed JSON', async () => {
    localStorage.setItem('pm-bad', '{not json}')
    const val = await storageGet('bad', 42)
    expect(val).toBe(42)
  })

  it('handles primitive values', async () => {
    await storageSet('num', 42)
    await storageSet('str', 'hello')
    await storageSet('bool', false)
    expect(await storageGet('num')).toBe(42)
    expect(await storageGet('str')).toBe('hello')
    expect(await storageGet('bool')).toBe(false)
  })
})

describe('storageRemove', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
    localStorage.clear()
  })

  it('removes existing key', async () => {
    await storageSet('temp', 'value')
    await storageRemove('temp')
    expect(await storageGet('temp')).toBeNull()
  })

  it('no error removing missing key', async () => {
    await storageRemove('does-not-exist')
  })
})

describe('storageKeys / storageClear', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
    localStorage.clear()
  })

  it('lists only pm-prefixed keys', async () => {
    await storageSet('a', 1)
    await storageSet('b', 2)
    localStorage.setItem('other', 'x')
    const keys = await storageKeys()
    expect(keys.sort()).toEqual(['a', 'b'])
    expect(keys).not.toContain('other')
  })

  it('clears all pm-prefixed keys', async () => {
    await storageSet('a', 1)
    await storageSet('b', 2)
    localStorage.setItem('other', 'keep')
    await storageClear()
    expect(await storageKeys()).toEqual([])
    expect(localStorage.getItem('other')).toBe('keep')
  })
})
