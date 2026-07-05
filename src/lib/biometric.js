import { registerPlugin } from '@capacitor/core'

const BiometricAuth = registerPlugin('BiometricAuth')
const SmsReader = registerPlugin('SmsReader')

let supported = null

export async function canUseBiometrics() {
  if (supported !== null) return supported
  if (typeof window === 'undefined') {
    supported = false
    return false
  }
  try {
    const native = await checkNativeBiometric()
    if (native) {
      supported = true
      return true
    }
  } catch (err) {
    // ignore
  }
  if (window.PublicKeyCredential) {
    supported = true
    return true
  }
  supported = false
  return false
}

export async function checkNativeBiometric() {
  try {
    const result = await BiometricAuth.isAvailable()
    return result.available
  } catch (err) {
    return false
  }
}

export async function registerBiometric(username) {
  if (!(await canUseBiometrics())) throw new Error('Biometric authentication not available')

  const nativeAvailable = await checkNativeBiometric()
  if (nativeAvailable) {
    const result = await BiometricAuth.authenticate({
      title: 'Enable Biometric Login',
      subtitle: `For user ${username}`,
      cancel: 'Cancel'
    })
    if (result.verified) {
      return `native:${username}`
    }
    throw new Error('Biometric registration failed')
  }

  if (window.PublicKeyCredential) {
    const challenge = new Uint8Array(32)
    window.crypto.getRandomValues(challenge)
    const userId = new TextEncoder().encode(username)
    const publicKey = {
      challenge,
      rp: { name: 'Pocket Money', id: window.location.hostname },
      user: {
        id: userId,
        name: username,
        displayName: username
      },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required'
      },
      timeout: 60000,
      attestation: 'none'
    }
    const credential = await navigator.credentials.create({ publicKey })
    return credential.id
  }

  throw new Error('Biometric registration failed')
}

export async function verifyBiometric(credentialId) {
  if (!(await canUseBiometrics())) throw new Error('Biometric authentication not available')

  const nativeAvailable = await checkNativeBiometric()
  if (nativeAvailable && credentialId?.startsWith('native:')) {
    const result = await BiometricAuth.authenticate({
      title: 'Unlock Pocket Money',
      subtitle: 'Use your biometric credential',
      cancel: 'Use PIN'
    })
    if (result.verified) return true
    throw new Error('Biometric verification failed')
  }

  if (window.PublicKeyCredential) {
    const challenge = new Uint8Array(32)
    window.crypto.getRandomValues(challenge)
    const publicKey = {
      challenge,
      allowCredentials: credentialId
        ? [{ id: base64ToUint8Array(credentialId), type: 'public-key' }]
        : [],
      userVerification: 'required',
      timeout: 60000
    }
    await navigator.credentials.get({ publicKey })
    return true
  }

  throw new Error('Biometric verification failed')
}

export async function readNativeSms() {
  try {
    const result = await SmsReader.getMessages()
    return result.messages || []
  } catch (err) {
    console.error('Native SMS read failed', err)
    return []
  }
}

function base64ToUint8Array(base64) {
  const binary = atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
