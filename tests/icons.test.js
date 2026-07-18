import { describe, it, expect } from 'vitest'
import { getIcon, ICON_NAMES } from '../src/lib/icons'

describe('getIcon', () => {
  it('returns a component for known icon names', () => {
    const icon = getIcon('Banknote')
    expect(icon).toBeDefined()
    expect(typeof icon).toBe('object')
  })

  it('returns fallback for unknown names', () => {
    const fallback = getIcon('unknown')
    const explicit = getIcon('unknown', getIcon('Banknote'))
    expect(fallback).toBeDefined()
    expect(explicit).toBe(getIcon('Banknote'))
  })

  it('returns CircleDollarSign as default fallback', () => {
    const fallback = getIcon('nonexistent-icon')
    const circleDollar = getIcon('CircleDollarSign')
    expect(fallback).toBe(circleDollar)
  })
})

describe('ICON_NAMES', () => {
  it('lists all available icon names', () => {
    expect(ICON_NAMES).toContain('Banknote')
    expect(ICON_NAMES).toContain('Utensils')
    expect(ICON_NAMES).toContain('ShoppingCart')
    expect(ICON_NAMES).toContain('Home')
    expect(ICON_NAMES).toContain('Wallet')
  })

  it('has at least 30 icons', () => {
    expect(ICON_NAMES.length).toBeGreaterThanOrEqual(30)
  })

  it('contains no duplicate names', () => {
    expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length)
  })
})
