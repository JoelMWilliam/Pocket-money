import { describe, it, expect, vi } from 'vitest'
import { idHash } from '../src/lib/notifications'

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    requestPermissions: vi.fn(() => Promise.resolve({ display: 'granted' })),
    schedule: vi.fn(() => Promise.resolve()),
    cancel: vi.fn(() => Promise.resolve()),
    getPending: vi.fn(() => Promise.resolve({ notifications: [] }))
  }
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false
  }
}))

describe('notifications helpers', () => {
  it('idHash returns deterministic positive integers', () => {
    const a = idHash('bill-1')
    const b = idHash('bill-1')
    const c = idHash('bill-2')
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(Number.isInteger(a)).toBe(true)
    expect(a).toBeGreaterThanOrEqual(0)
  })
})
