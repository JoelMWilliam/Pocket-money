import { useState } from 'react'
import { ArrowRight, Shield, Wallet, TrendingUp, Moon, Check } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1)
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [useDemo, setUseDemo] = useState(false)
  const createUser = useAppStore((state) => state.createUser)

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    if (!username.trim()) return setError('Enter your name')
    if (pin.length < 4) return setError('PIN must be at least 4 digits')
    if (pin !== confirmPin) return setError('PINs do not match')

    setLoading(true)
    try {
      await createUser(username.trim(), pin, { useDemo })
      onComplete?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const slides = [
    {
      icon: Wallet,
      title: 'Your money, private',
      text: 'All data stays on your device. No accounts, no subscriptions, no tracking.'
    },
    {
      icon: Shield,
      title: 'Locked by PIN',
      text: 'Keep your finances private. Only you can unlock Pocket Money.'
    },
    {
      icon: TrendingUp,
      title: 'Grow your wealth',
      text: 'Track spending, budget smart, plan debt payoff, and reach goals.'
    },
    {
      icon: Moon,
      title: 'Built for AMOLED',
      text: 'True black interface saves battery and looks great on OLED screens.'
    }
  ]

  if (step <= slides.length) {
    const Slide = slides[step - 1]
    const Icon = Slide.icon
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-black px-8 py-12 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-container">
          <Icon size={40} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-on-surface">{Slide.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{Slide.text}</p>

        <div className="mt-8 flex gap-2">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx + 1 === step ? 'w-6 bg-primary' : 'w-2 bg-outline-variant'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setStep(step + 1)}
          className="mt-8 flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-base font-semibold text-on-primary"
        >
          {step === slides.length ? 'Get Started' : 'Next'}
          <ArrowRight size={18} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-black px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container">
            <Check size={32} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-on-surface">Create your profile</h2>
          <p className="mt-2 text-sm text-on-surface-variant">Set up your local account</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <input
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError('') }}
            placeholder="Your name"
            className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError('') }}
              placeholder="PIN"
              className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-center text-xl tracking-widest text-on-surface"
            />
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={confirmPin}
              onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError('') }}
              placeholder="Confirm"
              className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-center text-xl tracking-widest text-on-surface"
            />
          </div>

          {error && <p className="text-center text-sm text-error">{error}</p>}

          <label className="flex items-center gap-3 text-sm text-on-surface-variant">
            <input
              type="checkbox"
              checked={useDemo}
              onChange={(e) => setUseDemo(e.target.checked)}
              className="h-5 w-5 rounded border-outline-variant bg-surface text-primary"
            />
            Load sample data to explore the app
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-primary py-3.5 text-base font-semibold text-on-primary disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
