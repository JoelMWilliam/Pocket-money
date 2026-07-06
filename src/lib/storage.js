import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

const IS_NATIVE = Capacitor.isNativePlatform()
const PREFIX = 'pm-'

// Zustand persist calls setItem with a JSON string and expects getItem to return one.
export const zustandStorage = {
  getItem: async (name) => {
    if (IS_NATIVE) {
      const result = await Preferences.get({ key: `${PREFIX}${name}` })
      return result.value ?? null
    }
    return localStorage.getItem(`${PREFIX}${name}`)
  },
  setItem: async (name, value) => {
    // value is already a JSON string from zustand persist; store as-is.
    if (IS_NATIVE) {
      await Preferences.set({ key: `${PREFIX}${name}`, value })
    } else {
      localStorage.setItem(`${PREFIX}${name}`, value)
    }
  },
  removeItem: async (name) => {
    if (IS_NATIVE) {
      await Preferences.remove({ key: `${PREFIX}${name}` })
    } else {
      localStorage.removeItem(`${PREFIX}${name}`)
    }
  }
}

export async function storageSet(key, value) {
  const serialized = JSON.stringify(value)
  if (IS_NATIVE) {
    await Preferences.set({ key: `${PREFIX}${key}`, value: serialized })
  } else {
    localStorage.setItem(`${PREFIX}${key}`, serialized)
  }
}

export async function storageGet(key, fallback = null) {
  if (IS_NATIVE) {
    const result = await Preferences.get({ key: `${PREFIX}${key}` })
    if (result.value === null || result.value === undefined) return fallback
    try {
      return JSON.parse(result.value)
    } catch {
      return fallback
    }
  }
  const raw = localStorage.getItem(`${PREFIX}${key}`)
  if (raw === null) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export async function storageRemove(key) {
  if (IS_NATIVE) {
    await Preferences.remove({ key: `${PREFIX}${key}` })
  } else {
    localStorage.removeItem(`${PREFIX}${key}`)
  }
}

export async function storageKeys() {
  if (IS_NATIVE) {
    const result = await Preferences.keys()
    return result.keys.filter((k) => k.startsWith(PREFIX)).map((k) => k.slice(PREFIX.length))
  }
  return Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).map((k) => k.slice(PREFIX.length))
}

export async function storageClear() {
  if (IS_NATIVE) {
    await Preferences.clear()
  } else {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k))
  }
}
