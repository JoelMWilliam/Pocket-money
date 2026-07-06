import { describe, it, expect } from 'vitest'
import { hashPin, verifyPin, generateRandomId, encryptData, decryptData } from '../src/lib/crypto'

describe('crypto PIN hashing', () => {
  it('hashes a PIN with PBKDF2 salt format', async () => {
    const hash = await hashPin('1234')
    expect(hash).toMatch(/^pbkdf2\$\d+\$[a-f0-9]{32}\$[a-f0-9]{64}$/)
  })

  it('produces different hashes for the same PIN', async () => {
    const a = await hashPin('1234')
    const b = await hashPin('1234')
    expect(a).not.toBe(b)
  })

  it('verifies the correct PIN', async () => {
    const hash = await hashPin('5678')
    expect(await verifyPin('5678', hash)).toBe(true)
  })

  it('rejects an incorrect PIN', async () => {
    const hash = await hashPin('5678')
    expect(await verifyPin('5679', hash)).toBe(false)
    expect(await verifyPin('', hash)).toBe(false)
  })

  it('supports legacy SHA-256 hashes for migration', async () => {
    const legacyHash = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'
    expect(await verifyPin('1234', legacyHash)).toBe(true)
    expect(await verifyPin('1235', legacyHash)).toBe(false)
  })

  it('handles malformed hashes gracefully', async () => {
    expect(await verifyPin('1234', 'pbkdf2$100000$short$hash')).toBe(false)
    expect(await verifyPin('1234', '')).toBe(false)
    expect(await verifyPin('1234', null)).toBe(false)
  })
})

describe('crypto IDs', () => {
  it('generates UUID-shaped IDs', () => {
    const id = generateRandomId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, generateRandomId))
    expect(ids.size).toBe(100)
  })
})

describe('crypto data encryption', () => {
  it('round-trips data with a passphrase', async () => {
    const payload = { accounts: [{ name: 'Bank', balance: 1000 }], note: 'secret' }
    const encrypted = await encryptData(payload, 'correct horse battery staple')
    expect(encrypted).toHaveProperty('salt')
    expect(encrypted).toHaveProperty('iv')
    expect(encrypted).toHaveProperty('data')
    const decrypted = await decryptData(encrypted, 'correct horse battery staple')
    expect(decrypted).toEqual(payload)
  })

  it('fails to decrypt with the wrong passphrase', async () => {
    const payload = { secret: 'value' }
    const encrypted = await encryptData(payload, 'right')
    await expect(decryptData(encrypted, 'wrong')).rejects.toThrow()
  })
})
