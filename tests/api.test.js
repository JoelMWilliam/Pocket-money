import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
  registerPlugin: vi.fn(() => ({}))
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
  localStorage.clear()
})

import {
  cloudAuth,
  cloudSync,
  getCloudToken,
  setCloudToken,
  getCloudUser,
  setCloudUser
} from '../src/lib/api'

describe('cloudAuth', () => {
  it('register calls POST /auth/register', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'abc' })
    })
    const result = await cloudAuth.register('user1', 'pass123')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toContain('/auth/register')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toEqual({ username: 'user1', password: 'pass123' })
    expect(result).toEqual({ token: 'abc' })
  })

  it('login calls POST /auth/login', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'xyz' })
    })
    const result = await cloudAuth.login('user1', 'pass123')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toContain('/auth/login')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toEqual({ username: 'user1', password: 'pass123' })
    expect(result).toEqual({ token: 'xyz' })
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Invalid credentials' })
    })
    await expect(cloudAuth.login('bad', 'wrong')).rejects.toThrow('Invalid credentials')
  })

  it('throws with status-only message when error body is absent', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve(null)
    })
    await expect(cloudAuth.login('x', 'y')).rejects.toThrow('Request failed: 500')
  })

  it('throws friendly message on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Failed to fetch'))
    await expect(cloudAuth.login('x', 'y')).rejects.toThrow('Cannot reach cloud server')
  })
})

describe('cloudSync', () => {
  it('get calls GET /sync', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ exists: true, payload: { data: {} } })
    })
    const result = await cloudSync.get()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('/sync')
    expect(mockFetch.mock.calls[0][1].method).toBeUndefined()
  })

  it('put sends data, version, and deviceId', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true })
    })
    const result = await cloudSync.put({ transactions: [] }, 12345, 'web')
    const opts = mockFetch.mock.calls[0][1]
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body).toEqual({ data: { transactions: [] }, version: 12345, deviceId: 'web' })
    expect(result).toEqual({ ok: true })
  })

  it('delete calls DELETE /sync', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true })
    })
    const result = await cloudSync.delete()
    expect(mockFetch.mock.calls[0][1].method).toBe('DELETE')
    expect(result).toEqual({ ok: true })
  })

  it('includes Authorization header when token exists', async () => {
    localStorage.setItem('pm-cloud-token', 'test-token')
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({})
    })
    await cloudSync.get()
    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers.Authorization).toBe('Bearer test-token')
  })
})

describe('getCloudToken / setCloudToken', () => {
  it('stores and retrieves token', () => {
    expect(getCloudToken()).toBeNull()
    setCloudToken('mytoken')
    expect(getCloudToken()).toBe('mytoken')
    expect(localStorage.getItem('pm-cloud-token')).toBe('mytoken')
  })

  it('removes token when called with null', () => {
    setCloudToken('mytoken')
    setCloudToken(null)
    expect(getCloudToken()).toBeNull()
  })
})

describe('getCloudUser / setCloudUser', () => {
  it('stores and retrieves username', () => {
    expect(getCloudUser()).toBeNull()
    setCloudUser('alice')
    expect(getCloudUser()).toBe('alice')
    expect(localStorage.getItem('pm-cloud-user')).toBe('alice')
  })

  it('removes user when called with null', () => {
    setCloudUser('alice')
    setCloudUser(null)
    expect(getCloudUser()).toBeNull()
  })
})
