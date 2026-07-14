import { useState } from 'react'
import { UserPlus, LogIn, Shield, Users } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export default function AuthScreen() {
  const { auth, createUser, login } = useAppStore()
  const [mode, setMode] = useState('login') // 'login' | 'create'
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [useDemo, setUseDemo] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const users = Object.keys(auth.users)

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    if (!username.trim()) return setError('Enter a username')
    if (auth.users[username]) return setError('Username already exists')
    if (pin.length < 4) return setError('PIN must be at least 4 digits')
    if (pin !== confirmPin) return setError('PINs do not match')

    setLoading(true)
    try {
      await createUser(username.trim(), pin, { useDemo })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    if (!username) return setError('Select a user')
    if (!pin) return setError('Enter PIN')

    setLoading(true)
    try {
      await login(username, pin)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-surface px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container">
            <Shield size={32} className="text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-on-surface">Pocket Money</h1>
          <p className="mt-2 text-sm text-on-surface-variant">Local-first finance</p>
        </div>

        {mode === 'login' && users.length > 0 ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-on-surface-variant">User</label>
              <select
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError('') }}
                className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
              >
                <option value="">Select user</option>
                {users.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-on-surface-variant">PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError('') }}
                placeholder="••••"
                className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-center text-2xl tracking-widest text-on-surface"
              />
            </div>

            {error && <p className="text-center text-sm text-error">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-primary py-3.5 text-base font-semibold text-on-primary disabled:opacity-50"
            >
              {loading ? 'Unlocking...' : 'Unlock'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('create'); setError(''); setPin('') }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-surface py-3 text-sm font-medium text-on-surface"
            >
              <UserPlus size={16} /> Add New User
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-on-surface-variant">Username</label>
              <input
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError('') }}
                placeholder="Your name"
                className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-on-surface-variant">PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError('') }}
                  placeholder="••••"
                  className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-center text-xl tracking-widest text-on-surface"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-on-surface-variant">Confirm</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={confirmPin}
                  onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError('') }}
                  placeholder="••••"
                  className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-center text-xl tracking-widest text-on-surface"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm text-on-surface">
              <input
                type="checkbox"
                checked={useDemo}
                onChange={(e) => setUseDemo(e.target.checked)}
                className="h-5 w-5 rounded border-outline-variant bg-surface text-primary"
              />
              Start with demo data
            </label>

            {error && <p className="text-center text-sm text-error">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-primary py-3.5 text-base font-semibold text-on-primary disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>

            {users.length > 0 && (
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setPin(''); setConfirmPin('') }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-surface py-3 text-sm font-medium text-on-surface"
              >
                <LogIn size={16} /> Back to Login
              </button>
            )}
          </form>
        )}

        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-on-surface-variant">
            <Users size={14} />
            <span>{users.length} user{users.length !== 1 ? 's' : ''} on this device</span>
          </div>
        </div>
      </div>
    </div>
  )
}
