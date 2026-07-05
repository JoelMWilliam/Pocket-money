import { useState } from 'react'
import { Lock, User } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export default function LockScreen() {
  const { auth, unlock, logout } = useAppStore()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-black px-6">
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
            autoFocus
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
