import { Capacitor } from '@capacitor/core'

// Graceful no-op on web; real haptics on Android via the Haptics plugin.
// We avoid a hard dependency on @capacitor/haptics by dynamically importing it
// only on native platforms, so web builds never fail even if the plugin is absent.

let Haptics = null

async function ensureHaptics() {
  if (Haptics !== null) return Haptics
  if (!Capacitor.isNativePlatform()) {
    Haptics = false
    return false
  }
  try {
    Haptics = (await import('@capacitor/haptics')).Haptics
  } catch (err) {
    console.warn('Haptics plugin unavailable', err)
    Haptics = false
  }
  return Haptics
}

function vibrateWeb(pattern) {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return false
  try {
    return navigator.vibrate(pattern)
  } catch (err) {
    return false
  }
}

// Lightweight, no-await fire-and-forget.  
// `style` ∈ {light, medium, heavy, soft, rigid, selection, success, warning, error}
export function haptic(style = 'light') {
  ensureHaptics().then((plugin) => {
    if (!plugin) return
    try {
      if (style === 'selection') {
        plugin.selectionStart({ duration: 8 })
      } else if (style === 'success' || style === 'warning' || style === 'error') {
        const typeMap = { success: 0, warning: 1, error: 2 }
        plugin.notification({ type: typeMap[style] })
      } else {
        // impact — light/medium/heavy/rigid/soft
        const valid = ['light', 'medium', 'heavy', 'rigid', 'soft']
        const impactStyle = valid.includes(style) ? style : 'light'
        plugin.impact({ style: impactStyle, duration: 12 })
      }
    } catch (err) {
      // ignore
    }
  })
  // web fallback (Android Chrome supports navigator.vibrate)
  if (!Capacitor.isNativePlatform()) {
    const map = {
      light: 10, medium: 18, heavy: 28, soft: 14, rigid: 24,
      selection: 8, success: [10, 40, 10], warning: [16, 40, 16], error: [24, 60, 24]
    }
    vibrateWeb(map[style] || 10)
  }
}

export function hapticSelect() { haptic('selection') }
export function hapticTap() { haptic('light') }
export function hapticConfirm() { haptic('success') }
export function hapticWarn() { haptic('warning') }
export function hapticError() { haptic('error') }

export default haptic