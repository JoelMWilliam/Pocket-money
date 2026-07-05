import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

const IS_NATIVE = Capacitor.isNativePlatform()
const PREFIX = 'pm-'

export const zustandStorage = {
  getItem: async (name) => {
    const value = await storageGet(name, null)
    return value
  },
  setItem: async (name, value) => {
    await storageSet(name, value)
  },
  removeItem: async (name) => {
    await storageRemove(name)
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
    if (!result.value) return fallback
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
