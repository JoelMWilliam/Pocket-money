import {
  argbFromHex,
  themeFromSourceColor,
  applyTheme,
  hexFromArgb
} from '@material/material-color-utilities'

export const DEFAULT_SEED = '#0A84FF'

export function generateTheme(seedColor = DEFAULT_SEED, isDark = true) {
  const theme = themeFromSourceColor(argbFromHex(seedColor))
  // Create a detached element to capture generated CSS variables
  const target = document.createElement('div')
  applyTheme(theme, { target, dark: isDark })
  const styles = {}
  for (const key of Object.keys(target.style)) {
    const value = target.style.getPropertyValue(key)
    if (value) styles[key] = value
  }
  return styles
}

export function hexFromArgbColor(argb) {
  return hexFromArgb(argb)
}

export function applyThemeToDocument(seedColor, isDark = true) {
  const root = document.documentElement

  try {
    const theme = themeFromSourceColor(argbFromHex(seedColor))
    applyTheme(theme, { target: root, dark: isDark })
  } catch (e) {
    console.warn('Dynamic theme generation failed, using fallback:', e)
  }

  if (isDark) {
    // AMOLED-safe dark palette overrides
    root.style.setProperty('--md-sys-color-background', '#000000')
    root.style.setProperty('--md-sys-color-on-background', '#E3E3E3')
    root.style.setProperty('--md-sys-color-surface', '#0A0A0A')
    root.style.setProperty('--md-sys-color-surface-bright', '#111111')
    root.style.setProperty('--md-sys-color-surface-variant', '#1C1C1E')
    root.style.setProperty('--md-sys-color-outline', '#38383A')
    root.style.setProperty('--md-sys-color-outline-variant', '#2C2C2E')
  } else {
    // Clean light palette overrides
    root.style.setProperty('--md-sys-color-background', '#FFFFFF')
    root.style.setProperty('--md-sys-color-on-background', '#1C1C1E')
    root.style.setProperty('--md-sys-color-surface', '#F2F2F7')
    root.style.setProperty('--md-sys-color-surface-bright', '#FFFFFF')
    root.style.setProperty('--md-sys-color-surface-variant', '#E5E5EA')
    root.style.setProperty('--md-sys-color-outline', '#C7C7CC')
    root.style.setProperty('--md-sys-color-outline-variant', '#D1D1D6')
  }

  root.classList.toggle('dark', isDark)
}

export const PRESET_COLORS = [
  { name: 'Ocean', value: '#0A84FF' },
  { name: 'Cobalt', value: '#5E5CE6' },
  { name: 'Teal', value: '#64D2FF' },
  { name: 'Mint', value: '#30D158' },
  { name: 'Gold', value: '#FFCC00' },
  { name: 'Orange', value: '#FF9500' },
  { name: 'Pink', value: '#FF375F' },
  { name: 'Purple', value: '#BF5AF2' }
]
