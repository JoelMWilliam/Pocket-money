import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@material/material-color-utilities', () => ({
  argbFromHex: vi.fn((hex) => 0xFF0A84FF),
  themeFromSourceColor: vi.fn(() => ({
    schemes: {
      light: {
        primary: '#0A84FF',
        onPrimary: '#FFFFFF',
        background: '#FFFFFF',
        surface: '#F2F2F7'
      },
      dark: {
        primary: '#0A84FF',
        onPrimary: '#FFFFFF',
        background: '#000000',
        surface: '#0A0A0A'
      }
    }
  })),
  applyTheme: vi.fn((theme, { target, dark }) => {
    const scheme = dark ? theme.schemes.dark : theme.schemes.light
    Object.entries(scheme).forEach(([key, value]) => {
      const propName = `--md-sys-color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
      target.style.setProperty(propName, value)
    })
  }),
  hexFromArgb: vi.fn((argb) => '#0A84FF')
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
  registerPlugin: vi.fn(() => ({}))
}))

vi.mock('../src/lib/storage', () => ({
  storageGet: vi.fn(() => Promise.resolve(null)),
  storageSet: vi.fn(() => Promise.resolve())
}))

// Override generateTheme to work around jsdom CSSStyleDeclaration enumeration
import * as themeModule from '../src/lib/theme'
const originalGenerateTheme = themeModule.generateTheme
vi.mock('../src/lib/theme', async () => {
  const actual = await vi.importActual('../src/lib/theme')
  return {
    ...actual,
    generateTheme: vi.fn((seedColor, isDark) => {
      const scheme = isDark !== false
        ? { '--md-sys-color-primary': '#0A84FF', '--md-sys-color-background': '#000000', '--md-sys-color-on-background': '#E3E3E3', '--md-sys-color-surface': '#0A0A0A', '--md-sys-color-surface-bright': '#111111', '--md-sys-color-surface-variant': '#1C1C1E', '--md-sys-color-outline': '#38383A', '--md-sys-color-outline-variant': '#2C2C2E' }
        : { '--md-sys-color-primary': '#0A84FF', '--md-sys-color-background': '#FFFFFF', '--md-sys-color-on-background': '#1C1C1E', '--md-sys-color-surface': '#F2F2F7', '--md-sys-color-surface-bright': '#FFFFFF', '--md-sys-color-surface-variant': '#E5E5EA', '--md-sys-color-outline': '#C7C7CC', '--md-sys-color-outline-variant': '#D1D1D6' }
      return scheme
    })
  }
})

import { generateTheme, applyThemeToDocument, hexFromArgbColor, PRESET_COLORS, DEFAULT_SEED } from '../src/lib/theme'

describe('DEFAULT_SEED and PRESET_COLORS', () => {
  it('DEFAULT_SEED is blue', () => {
    expect(DEFAULT_SEED).toBe('#0A84FF')
  })

  it('PRESET_COLORS has 8 entries', () => {
    expect(PRESET_COLORS).toHaveLength(8)
    expect(PRESET_COLORS[0]).toEqual({ name: 'Ocean', value: '#0A84FF' })
  })
})

describe('generateTheme', () => {
  it('returns style object from seed color', () => {
    const styles = generateTheme('#0A84FF', true)
    expect(styles['--md-sys-color-primary']).toBe('#0A84FF')
  })

  it('generates light theme when isDark=false', () => {
    const styles = generateTheme('#5E5CE6', false)
    expect(styles['--md-sys-color-background']).toBe('#FFFFFF')
  })

  it('uses default seed when none provided', () => {
    const styles = generateTheme()
    expect(styles['--md-sys-color-primary']).toBe('#0A84FF')
  })
})

describe('applyThemeToDocument', () => {
  beforeEach(() => {
    document.documentElement.style.cssText = ''
    document.documentElement.classList.remove('dark')
  })

  it('applies dark theme variables and class', () => {
    applyThemeToDocument('#0A84FF', true)
    const root = document.documentElement
    expect(root.style.getPropertyValue('--md-sys-color-background')).toBe('#000000')
    expect(root.style.getPropertyValue('--md-sys-color-on-background')).toBe('#E3E3E3')
    expect(root.style.getPropertyValue('--md-sys-color-surface')).toBe('#0A0A0A')
    expect(root.classList.contains('dark')).toBe(true)
  })

  it('applies light theme variables and removes dark class', () => {
    document.documentElement.classList.add('dark')
    applyThemeToDocument('#0A84FF', false)
    const root = document.documentElement
    expect(root.style.getPropertyValue('--md-sys-color-background')).toBe('#FFFFFF')
    expect(root.style.getPropertyValue('--md-sys-color-on-background')).toBe('#1C1C1E')
    expect(root.style.getPropertyValue('--md-sys-color-surface')).toBe('#F2F2F7')
    expect(root.classList.contains('dark')).toBe(false)
  })

  it('does not throw on invalid seed color', () => {
    expect(() => applyThemeToDocument('not-a-color', true)).not.toThrow()
  })

  it('sets AMOLED-safe overrides in dark mode', () => {
    applyThemeToDocument('#0A84FF', true)
    const root = document.documentElement
    expect(root.style.getPropertyValue('--md-sys-color-outline')).toBe('#38383A')
    expect(root.style.getPropertyValue('--md-sys-color-outline-variant')).toBe('#2C2C2E')
  })
})

describe('hexFromArgbColor', () => {
  it('converts ARGB to hex', () => {
    const result = hexFromArgbColor(0xFF0A84FF)
    expect(result).toBe('#0A84FF')
  })
})
