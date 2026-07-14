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
    const result = await BiometricAuth.checkBiometry()
    supported = result.isAvailable === true
    return supported
  } catch (err) {
    // If the plugin is not available (e.g. web), fall back to WebAuthn.
    supported = !!window.PublicKeyCredential
    return supported
  }
}

export async function registerBiometric(username) {
  if (!(await canUseBiometrics())) throw new Error('Biometric authentication not available')

  try {
    await BiometricAuth.authenticate({
      reason: 'Enable biometric login for Pocket Money',
      cancelTitle: 'Cancel',
      allowDeviceCredential: true,
      iosFallbackTitle: 'Use PIN',
      androidTitle: 'Enable Biometric Login',
      androidSubtitle: 'Authenticate to enable biometric unlock',
      androidConfirmationRequired: false
    })
    return 'native:biometric'
  } catch (err) {
    // Fall back to WebAuthn on browsers.
    if (!window.PublicKeyCredential) throw new Error('Biometric authentication not available')
    const challenge = new Uint8Array(32)
    window.crypto.getRandomValues(challenge)
    const userId = new TextEncoder().encode(username)
    const publicKey = {
      challenge,
      rp: { name: 'Pocket Money', id: window.location.hostname },
      user: { id: userId, name: username, displayName: username },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      timeout: 60000,
      attestation: 'none'
    }
    const credential = await navigator.credentials.create({ publicKey })
    return credential.id
  }
}

export async function verifyBiometric(credentialId) {
  if (!(await canUseBiometrics())) throw new Error('Biometric authentication not available')

  try {
    await BiometricAuth.authenticate({
      reason: 'Unlock Pocket Money',
      cancelTitle: 'Use PIN',
      allowDeviceCredential: true,
      iosFallbackTitle: 'Use PIN',
      androidTitle: 'Unlock Pocket Money',
      androidSubtitle: 'Use your biometric credential',
      androidConfirmationRequired: false
    })
    return true
  } catch (err) {
    if (!window.PublicKeyCredential) throw new Error('Biometric verification failed')
    const challenge = new Uint8Array(32)
    window.crypto.getRandomValues(challenge)
    const publicKey = {
      challenge,
      allowCredentials: credentialId ? [{ id: base64ToUint8Array(credentialId), type: 'public-key' }] : [],
      userVerification: 'required',
      timeout: 60000
    }
    await navigator.credentials.get({ publicKey })
    return true
  }
}

export async function readNativeSms() {
  const result = await SmsReader.getMessages()
  return result.messages || []
}

function base64ToUint8Array(base64) {
  const binary = atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
