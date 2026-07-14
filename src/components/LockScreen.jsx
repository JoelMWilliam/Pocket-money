import { useState, useEffect } from 'react'
import { Lock, User, Fingerprint } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { canUseBiometrics } from '../lib/biometric'

export default function LockScreen() {
  const { auth, unlock, logout } = useAppStore()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [bioAvailable, setBioAvailable] = useState(false)

  const user = auth.users[auth.currentUser]
  const biometricEnabled = user?.biometricEnabled

  useEffect(() => {
    canUseBiometrics().then(setBioAvailable)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!pin) return
    setLoading(true)
    try {
      await unlock(pin)
      setPin('')
    } catch (err) {
      setError(err.message)
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  const handleBiometric = async () => {
    setError('')
    setLoading(true)
    try {
      await unlock(null, { biometric: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-container">
          <Lock size={36} className="text-primary" />
        </div>

        <p className="text-sm text-on-surface-variant">Welcome back</p>
        <h2 className="mt-1 text-2xl font-bold text-on-surface">{auth.currentUser}</h2>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError('') }}
            placeholder="Enter PIN"
            className="w-full rounded-2xl border border-outline-variant bg-surface px-4 py-4 text-center text-3xl tracking-[0.3em] text-on-surface"
          />

          {error && <p className="text-center text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="w-full rounded-2xl bg-primary py-3.5 text-base font-semibold text-on-primary disabled:opacity-50"
          >
            {loading ? 'Unlocking...' : 'Unlock'}
          </button>
        </form>

        {bioAvailable && biometricEnabled && (
          <button
            onClick={handleBiometric}
            disabled={loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-surface py-3 text-sm font-medium text-on-surface disabled:opacity-50"
          >
            <Fingerprint size={18} /> Use Biometric
          </button>
        )}

        <button
          onClick={logout}
          className="mt-6 flex items-center justify-center gap-2 text-sm text-on-surface-variant"
        >
          <User size={14} /> Switch user
        </button>
      </div>
    </div>
  )
}
