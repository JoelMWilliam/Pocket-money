import { useState, useEffect } from 'react'
import {
  ArrowRight, Shield, Cloud, Wallet, Check, Bell, MessageSquare,
  Smartphone, TrendingUp, Target, Fingerprint, Sparkles, ChevronRight,
  CreditCard, PieChart, User, Moon, Sun, Palette, Plus, Trash2,
  Building2, Banknote, Landmark, Landmark as BankIcon
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import AvatarPicker from './AvatarPicker'
import { signInToGoogleDrive } from '../lib/googleDrive'
import { requestSmsPermission, checkSmsPermission } from '../lib/sms'
import { requestNotificationPermission, scheduleDailyReminder, scheduleReportNotification } from '../lib/notifications'
import { storageSet } from '../lib/storage'
import { canUseBiometrics } from '../lib/biometric'
import { useTheme } from '../hooks/useTheme'
import { PRESET_COLORS } from '../lib/theme'
import { encryptAccountNumber } from '../lib/accountNumber'
import { getIcon } from '../lib/icons'

const SCREENS = ['welcome', 'values', 'theme', 'choice', 'profile', 'categories', 'accounts', 'goal', 'permissions', 'success']

const VALUE_PROPS = [
  {
    icon: Shield,
    title: 'Private by design',
    description: 'Your financial data lives on this device. No cloud, no tracking, no bank linking required.',
    color: '#30D158'
  },
  {
    icon: Smartphone,
    title: 'Auto-import bank SMS',
    description: 'Turn SMS alerts into transactions automatically. Works offline, no manual typing.',
    color: '#0A84FF'
  },
  {
    icon: TrendingUp,
    title: 'Understand your money',
    description: 'Track spending, budgets, and net worth with a clean, modern dashboard.',
    color: '#BF5AF2'
  }
]

const GOALS = [
  { id: 'save', icon: Target, label: 'Save money', description: 'Build savings and cut unnecessary spending' },
  { id: 'track', icon: PieChart, label: 'Track spending', description: 'See where every rupee goes' },
  { id: 'debt', icon: CreditCard, label: 'Pay off debt', description: 'Manage loans and credit cards' },
  { id: 'grow', icon: TrendingUp, label: 'Grow wealth', description: 'Investments and net worth tracking' }
]

const ACCOUNT_TYPES = [
  { id: 'bank', label: 'Bank', icon: Building2 },
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'credit', label: 'Credit Card', icon: CreditCard },
  { id: 'investment', label: 'Investment', icon: Landmark }
]

const CATEGORY_TYPES = [
  { id: 'expense', label: 'Expense' },
  { id: 'income', label: 'Income' },
  { id: 'transfer', label: 'Transfer' }
]

const ICON_NAMES = ['Utensils', 'ShoppingCart', 'Bus', 'Fuel', 'Receipt', 'Home', 'ShieldCheck', 'Film', 'ShoppingBag', 'HeartPulse', 'GraduationCap', 'Plane', 'Gift', 'HandHeart', 'Smile', 'PawPrint', 'CreditCard', 'TrendingUp', 'Banknote', 'Briefcase', 'RotateCcw', 'Percent', 'Coins', 'ArrowLeftRight', 'CircleDollarSign']

const CATEGORY_ICON_MAP = {
  expense: 'Utensils',
  income: 'Banknote',
  transfer: 'ArrowLeftRight'
}

const TYPE_COLORS = {
  expense: '#FF9500',
  income: '#30D158',
  transfer: '#8E8E93'
}

export default function Onboarding({ onComplete }) {
  const [screen, setScreen] = useState('welcome')
  const [valueIndex, setValueIndex] = useState(0)
  const [username, setUsername] = useState('')
  const [avatar, setAvatar] = useState(null)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [useDemo, setUseDemo] = useState(false)
  const [googleAuth, setGoogleAuth] = useState(null)
  const [goal, setGoal] = useState('track')
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [biometricStatus, setBiometricStatus] = useState('')
  const [isDark, setIsDark] = useState(true)
  const [seedColor, setSeedColor] = useState('#0A84FF')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([])
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [customCategory, setCustomCategory] = useState({
    name: '',
    type: 'expense',
    icon: 'Utensils',
    color: '#FF9500'
  })
  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'bank',
    balance: '',
    accountNumber: ''
  })

  const createUser = useAppStore((state) => state.createUser)
  const storeCategories = useAppStore((state) => state.categories)
  const storeAccounts = useAppStore((state) => state.accounts)
  const storeTransactions = useAppStore((state) => state.transactions)
  const addCategory = useAppStore((state) => state.addCategory)
  const deleteCategory = useAppStore((state) => state.deleteCategory)
  const addAccount = useAppStore((state) => state.addAccount)
  const deleteAccount = useAppStore((state) => state.deleteAccount)

  useTheme(seedColor, isDark)

  useEffect(() => {
    canUseBiometrics().then(setBiometricAvailable).catch(() => setBiometricAvailable(false))
  }, [])

  useEffect(() => {
    if (screen === 'categories' && selectedCategoryIds.length === 0 && storeCategories.length > 0) {
      setSelectedCategoryIds(storeCategories.map((c) => c.id))
    }
  }, [screen, storeCategories, selectedCategoryIds])

  const totalSteps = SCREENS.length
  const currentStep = SCREENS.indexOf(screen) + 1

  const nextScreen = (name) => {
    setError('')
    setScreen(name)
  }

  const handleGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      const auth = await signInToGoogleDrive()
      setGoogleAuth(auth)
      nextScreen('profile')
      if (auth.email) setUsername(auth.email.split('@')[0])
    } catch (err) {
      setError(err.message || 'Google sign-in failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleLocal = () => {
    setGoogleAuth(null)
    nextScreen('profile')
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    if (!username.trim()) return setError('Enter your name')
    if (pin.length < 4) return setError('PIN must be at least 4 digits')
    if (pin !== confirmPin) return setError('PINs do not match')

    setLoading(true)
    try {
      await createUser(username.trim(), pin, { useDemo, avatar })
      if (googleAuth?.email) {
        useAppStore.getState().updateSettings({
          googleDriveBackupEnabled: true,
          googleDriveBackupEmail: googleAuth.email,
          googleDriveBackupInterval: 'daily'
        })
      }
      useAppStore.getState().updateSettings({
        onboardingGoal: goal,
        isDark,
        seedColor,
        currency: 'LKR'
      })
      if (biometricEnabled) {
        try {
          await useAppStore.getState().enableBiometric()
          setBiometricStatus('enabled')
        } catch (err) {
          setBiometricStatus('failed')
          setError('Biometric setup failed: ' + (err.message || 'unknown error') + '. You can enable it later in Settings.')
        }
      }
      nextScreen('categories')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryToggle = (id) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleCategoriesContinue = () => {
    const usedCategoryIds = new Set(storeTransactions.map((t) => t.categoryId).filter(Boolean))
    for (const c of storeCategories) {
      if (!selectedCategoryIds.includes(c.id) && !usedCategoryIds.has(c.id)) {
        deleteCategory(c.id)
      }
    }
    nextScreen('accounts')
  }

  const handleAddCustomCategory = (e) => {
    e.preventDefault()
    if (!customCategory.name.trim()) return
    addCategory({
      name: customCategory.name.trim(),
      type: customCategory.type,
      icon: customCategory.icon,
      color: customCategory.color
    })
    setCustomCategory({
      name: '',
      type: 'expense',
      icon: 'Utensils',
      color: '#FF9500'
    })
    setShowCustomCategory(false)
  }

  const handleAddAccount = async (e) => {
    e.preventDefault()
    if (!accountForm.name.trim()) return
    const store = useAppStore.getState()
    const pinHash = store.auth.users[store.auth.currentUser]?.pinHash
    const rawNumber = accountForm.accountNumber?.replace(/\s/g, '') || ''
    const accountNumberEncrypted = rawNumber ? await encryptAccountNumber(rawNumber, pinHash) : null
    addAccount({
      name: accountForm.name.trim(),
      type: accountForm.type,
      balance: Number(accountForm.balance) || 0,
      currency: 'LKR',
      color: '#0A84FF',
      icon: 'Building2',
      accountNumberEncrypted
    })
    setAccountForm({ name: '', type: 'bank', balance: '', accountNumber: '' })
  }

  const finishOnboarding = async () => {
    useAppStore.getState().updateSettings({ onboardingComplete: true })
    await storageSet('first-boot-permissions', true)
    try {
      const { maybeAutoImportSms } = await import('../lib/sms')
      await maybeAutoImportSms(useAppStore.getState())
    } catch (err) {
      console.warn('Post-onboarding SMS import failed', err)
    }
    onComplete?.()
  }

  const renderProgress = () => (
    <div className="absolute top-0 left-0 right-0 z-10 px-6 pt-6">
      <div className="flex items-center justify-between gap-2">
        {SCREENS.map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              i < currentStep ? 'bg-primary' : 'bg-surface-variant'
            }`}
          />
        ))}
      </div>
      <p className="mt-3 text-center text-xs font-medium text-on-surface-variant">
        Step {currentStep} of {totalSteps}
      </p>
    </div>
  )

  const WelcomeScreen = () => (
    <div className="animate-fade-in flex min-h-[100dvh] flex-col items-center justify-center bg-surface px-6 py-12 text-center">
      <div className="mb-8 inline-flex h-32 w-32 items-center justify-center rounded-[2rem] bg-gradient-to-br from-primary to-tertiary shadow-2xl shadow-primary/20">
        <Wallet size={64} className="text-black" />
      </div>
      <h1 className="text-5xl font-bold tracking-tight text-on-surface">Pocket Money</h1>
      <p className="mt-4 max-w-xs text-lg leading-relaxed text-on-surface-variant">
        Your personal finances, private by design.
      </p>
      <button
        onClick={() => nextScreen('values')}
        className="mt-12 flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-on-primary transition-transform active:scale-95"
      >
        Get Started
        <ArrowRight size={18} />
      </button>
    </div>
  )

  const ValuesScreen = () => {
    const prop = VALUE_PROPS[valueIndex]
    const Icon = prop.icon
    return (
      <div className="animate-slide-up flex min-h-[100dvh] flex-col justify-between bg-surface px-6 py-12">
        {renderProgress()}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div
            className="mb-8 inline-flex h-28 w-28 items-center justify-center rounded-3xl"
            style={{ backgroundColor: `${prop.color}22` }}
          >
            <Icon size={48} style={{ color: prop.color }} />
          </div>
          <h2 className="text-3xl font-bold text-on-surface">{prop.title}</h2>
          <p className="mt-4 max-w-xs text-base leading-relaxed text-on-surface-variant">
            {prop.description}
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex justify-center gap-2">
            {VALUE_PROPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setValueIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === valueIndex ? 'w-8 bg-primary' : 'w-2 bg-surface-variant'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => {
              if (valueIndex < VALUE_PROPS.length - 1) setValueIndex(valueIndex + 1)
              else nextScreen('theme')
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-on-primary transition-transform active:scale-95"
          >
            {valueIndex < VALUE_PROPS.length - 1 ? 'Next' : 'Continue'}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    )
  }

  const ThemeScreen = () => (
    <div className="animate-slide-up flex min-h-[100dvh] flex-col justify-center bg-surface px-6 py-12">
      {renderProgress()}
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container">
            <Palette size={32} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-on-surface">Make it yours</h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Choose a look and accent color. You can change this later in Settings.
          </p>
        </div>

        <div className="flex rounded-2xl border border-outline-variant bg-surface p-1">
          <button
            onClick={() => setIsDark(false)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all ${
              !isDark ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
            }`}
          >
            <Sun size={18} /> Light
          </button>
          <button
            onClick={() => setIsDark(true)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all ${
              isDark ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
            }`}
          >
            <Moon size={18} /> Dark
          </button>
        </div>

        <p className="mb-3 mt-6 text-xs font-medium text-on-surface-variant">Accent color</p>
        <div className="grid grid-cols-4 gap-3">
          {PRESET_COLORS.map((c) => {
            const selected = c.value === seedColor
            return (
              <button
                key={c.value}
                onClick={() => setSeedColor(c.value)}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all ${
                  selected ? 'border-primary bg-primary-container/20' : 'border-outline-variant bg-surface'
                }`}
              >
                <div
                  className={`h-10 w-10 rounded-full border-2 ${selected ? 'border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: c.value }}
                />
                <span className={`text-[10px] font-medium ${selected ? 'text-primary' : 'text-on-surface-variant'}`}>{c.name}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-outline-variant bg-surface-bright p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary-container p-2 text-primary">
                <Wallet size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-on-surface">Preview</p>
                <p className="text-xs text-on-surface-variant">This is how your app will look</p>
              </div>
            </div>
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: seedColor }} />
          </div>
        </div>

        <button
          onClick={() => nextScreen('choice')}
          className="mt-8 w-full rounded-2xl bg-primary py-4 text-base font-semibold text-on-primary"
        >
          Continue
        </button>
      </div>
    </div>
  )

  const ChoiceScreen = () => (
    <div className="animate-slide-up flex min-h-[100dvh] flex-col justify-center bg-surface px-6 py-12">
      {renderProgress()}
      <div className="mx-auto w-full max-w-sm">
        <h2 className="text-center text-3xl font-bold text-on-surface">Choose your vault</h2>
        <p className="mt-2 text-center text-sm text-on-surface-variant">
          You can change this anytime in Settings.
        </p>

        <div className="mt-10 space-y-4">
          <button
            onClick={handleLocal}
            className="group flex w-full items-center gap-4 rounded-3xl bg-surface p-6 text-left transition-all hover:bg-surface-bright border border-outline-variant"
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-primary">
              <Shield size={32} />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-on-surface">Local account</p>
              <p className="text-xs text-on-surface-variant">
                Everything stays on this device. No cloud, no accounts.
              </p>
            </div>
            <ChevronRight size={20} className="text-on-surface-variant transition-transform group-hover:translate-x-1" />
          </button>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="group flex w-full items-center gap-4 rounded-3xl bg-surface p-6 text-left transition-all hover:bg-surface-bright border border-outline-variant disabled:opacity-50"
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-primary">
              <Cloud size={32} />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-on-surface">Back up with Google</p>
              <p className="text-xs text-on-surface-variant">
                Sign in with Gmail and auto-backup to Google Drive.
              </p>
            </div>
            <ChevronRight size={20} className="text-on-surface-variant transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-error">{error}</p>
        )}
      </div>
    </div>
  )

  const ProfileScreen = () => (
    <div className="animate-slide-up flex min-h-[100dvh] flex-col items-center justify-center bg-surface px-6 py-12">
      {renderProgress()}
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container">
            <User size={32} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-on-surface">Create your profile</h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            {googleAuth ? 'Set a name and PIN for this device.' : 'Set up your local account.'}
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="flex justify-center">
            <AvatarPicker value={avatar} onChange={setAvatar} size={96} />
          </div>

          <input
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError('') }}
            placeholder="Your name"
            className="w-full rounded-2xl border border-outline-variant bg-surface px-4 py-3.5 text-on-surface"
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
              className="w-full rounded-2xl border border-outline-variant bg-surface px-4 py-3.5 text-center text-xl tracking-widest text-on-surface"
            />
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={confirmPin}
              onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError('') }}
              placeholder="Confirm"
              className="w-full rounded-2xl border border-outline-variant bg-surface px-4 py-3.5 text-center text-xl tracking-widest text-on-surface"
            />
          </div>

          {biometricAvailable && (
            <label className="flex items-center gap-3 rounded-2xl bg-surface p-4 text-sm text-on-surface-variant border border-outline-variant">
              <Fingerprint size={20} className="text-primary" />
              <span className="flex-1">Use biometric unlock</span>
              <input
                type="checkbox"
                checked={biometricEnabled}
                onChange={(e) => setBiometricEnabled(e.target.checked)}
                className="h-5 w-5 rounded border-outline-variant bg-surface text-primary"
              />
            </label>
          )}

          {biometricStatus === 'enabled' && (
            <p className="text-center text-sm text-green-500">Biometric enabled successfully</p>
          )}
          {biometricStatus === 'failed' && (
            <p className="text-center text-sm text-error">Biometric setup failed - you can enable it later in Settings</p>
          )}

          <label className="flex items-center gap-3 text-sm text-on-surface-variant">
            <input
              type="checkbox"
              checked={useDemo}
              onChange={(e) => setUseDemo(e.target.checked)}
              className="h-5 w-5 rounded border-outline-variant bg-surface text-primary"
            />
            Load sample data to explore the app
          </label>

          {googleAuth?.email && (
            <div className="rounded-2xl bg-primary-container/50 p-4 text-sm text-on-surface">
              Google Drive backup will be enabled for{' '}
              <span className="font-medium text-primary">{googleAuth.email}</span>.
            </div>
          )}

          {error && <p className="text-center text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-primary py-4 text-base font-semibold text-on-primary disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )

  const CategoriesScreen = () => {
    const grouped = CATEGORY_TYPES.map((t) => ({
      ...t,
      items: storeCategories.filter((c) => c.type === t.id)
    }))

    return (
      <div className="animate-slide-up flex min-h-[100dvh] flex-col bg-surface px-6 py-12">
        {renderProgress()}
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container">
              <PieChart size={32} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-on-surface">Pick your categories</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              We'll keep the ones you select. You can always add more later.
            </p>
          </div>

          <div className="mb-4 flex-1 space-y-5 overflow-y-auto pr-1">
            {grouped.map((group) => (
              <div key={group.id}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{group.label}</p>
                <div className="grid grid-cols-2 gap-2">
                  {group.items.map((c) => {
                    const Icon = getIcon(c.icon)
                    const selected = selectedCategoryIds.includes(c.id)
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleCategoryToggle(c.id)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-all ${
                          selected
                            ? 'border-primary bg-primary-container/30 text-primary'
                            : 'border-outline-variant bg-surface text-on-surface-variant'
                        }`}
                      >
                        <Icon size={16} />
                        <span className="flex-1 text-left">{c.name}</span>
                        {selected && <Check size={16} className="text-primary" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {!showCustomCategory ? (
            <button
              onClick={() => setShowCustomCategory(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-outline-variant bg-surface py-3 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-bright"
            >
              <Plus size={18} />
              Add custom category
            </button>
          ) : (
            <form onSubmit={handleAddCustomCategory} className="rounded-2xl border border-outline-variant bg-surface p-4">
              <input
                value={customCategory.name}
                onChange={(e) => setCustomCategory({ ...customCategory, name: e.target.value })}
                placeholder="Category name"
                className="w-full rounded-xl border border-outline-variant bg-surface-bright px-3 py-2 text-sm text-on-surface"
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <select
                  value={customCategory.type}
                  onChange={(e) => {
                    const type = e.target.value
                    setCustomCategory({
                      ...customCategory,
                      type,
                      icon: CATEGORY_ICON_MAP[type],
                      color: TYPE_COLORS[type]
                    })
                  }}
                  className="w-full rounded-xl border border-outline-variant bg-surface-bright px-3 py-2 text-sm text-on-surface"
                >
                  {CATEGORY_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                <select
                  value={customCategory.icon}
                  onChange={(e) => setCustomCategory({ ...customCategory, icon: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface-bright px-3 py-2 text-sm text-on-surface"
                >
                  {ICON_NAMES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCustomCategory({ ...customCategory, color: c.value })}
                    className={`h-6 w-6 rounded-full border-2 ${customCategory.color === c.value ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomCategory(false)}
                  className="flex-1 rounded-xl bg-surface-variant py-2 text-sm font-medium text-on-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-on-primary"
                >
                  Add
                </button>
              </div>
            </form>
          )}

          <button
            onClick={handleCategoriesContinue}
            className="mt-6 w-full rounded-2xl bg-primary py-4 text-base font-semibold text-on-primary"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  const AccountsScreen = () => {
    const TypeIcon = ACCOUNT_TYPES.find((t) => t.id === accountForm.type)?.icon || Building2

    return (
      <div className="animate-slide-up flex min-h-[100dvh] flex-col bg-surface px-6 py-12">
        {renderProgress()}
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container">
              <Building2 size={32} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-on-surface">Add your accounts</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Add at least one account or card so SMS import can map transactions correctly.
            </p>
          </div>

          <div className="mb-4 flex-1 space-y-3 overflow-y-auto pr-1">
            {storeAccounts.length === 0 && (
              <p className="text-center text-sm text-on-surface-variant py-4">No accounts yet. Add your first one below.</p>
            )}
            {storeAccounts.map((a) => {
              const Icon = getIcon(a.icon, Building2)
              return (
                <div key={a.id} className="flex items-center justify-between rounded-2xl border border-outline-variant bg-surface p-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl p-2" style={{ backgroundColor: `${a.color}22` }}>
                      <Icon size={20} style={{ color: a.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{a.name}</p>
                      <p className="text-xs text-on-surface-variant">{ACCOUNT_TYPES.find((t) => t.id === a.type)?.label || a.type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteAccount(a.id)}
                    className="rounded-full p-2 text-on-surface-variant hover:bg-error/10 hover:text-error"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })}
          </div>

          <form onSubmit={handleAddAccount} className="rounded-2xl border border-outline-variant bg-surface p-4">
            <div className="grid grid-cols-2 gap-3">
              <input
                value={accountForm.name}
                onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                placeholder="Account name"
                className="w-full rounded-xl border border-outline-variant bg-surface-bright px-3 py-2 text-sm text-on-surface"
              />
              <select
                value={accountForm.type}
                onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })}
                className="w-full rounded-xl border border-outline-variant bg-surface-bright px-3 py-2 text-sm text-on-surface"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <input
                type="number"
                step="0.01"
                value={accountForm.balance}
                onChange={(e) => setAccountForm({ ...accountForm, balance: e.target.value })}
                placeholder="Current balance"
                className="w-full rounded-xl border border-outline-variant bg-surface-bright px-3 py-2 text-sm text-on-surface"
              />
              <input
                type="password"
                inputMode="numeric"
                maxLength={20}
                value={accountForm.accountNumber}
                onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value.replace(/[^\d\s]/g, '') })}
                placeholder="Card / account number"
                className="w-full rounded-xl border border-outline-variant bg-surface-bright px-3 py-2 text-sm text-on-surface"
              />
            </div>
            <button
              type="submit"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-on-primary"
            >
              <Plus size={18} />
              Add account
            </button>
          </form>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => nextScreen('goal')}
              className="flex-1 rounded-2xl border border-outline-variant bg-surface py-4 text-base font-semibold text-on-surface"
            >
              Skip
            </button>
            <button
              onClick={() => nextScreen('goal')}
              disabled={storeAccounts.length === 0}
              className="flex-1 rounded-2xl bg-primary py-4 text-base font-semibold text-on-primary disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    )
  }

  const GoalScreen = () => (
    <div className="animate-slide-up flex min-h-[100dvh] flex-col justify-center bg-surface px-6 py-12">
      {renderProgress()}
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container">
            <Target size={32} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-on-surface">What brings you here?</h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            We'll tailor the dashboard to your goal.
          </p>
        </div>

        <div className="space-y-3">
          {GOALS.map((g) => {
            const Icon = g.icon
            const selected = g.id === goal
            return (
              <button
                key={g.id}
                onClick={() => setGoal(g.id)}
                className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                  selected
                    ? 'border-primary bg-primary-container/30'
                    : 'border-outline-variant bg-surface hover:bg-surface-bright'
                }`}
              >
                <div className={`rounded-xl p-2.5 ${selected ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'}`}>
                  <Icon size={22} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${selected ? 'text-primary' : 'text-on-surface'}`}>{g.label}</p>
                  <p className="text-xs text-on-surface-variant">{g.description}</p>
                </div>
                {selected && <Check size={18} className="text-primary" />}
              </button>
            )
          })}
        </div>

        <button
          onClick={() => nextScreen('permissions')}
          className="mt-8 w-full rounded-2xl bg-primary py-4 text-base font-semibold text-on-primary"
        >
          Continue
        </button>
      </div>
    </div>
  )

  const SuccessScreen = () => (
    <div className="animate-fade-in flex min-h-[100dvh] flex-col items-center justify-center bg-surface px-6 py-12 text-center">
      <div className="mb-8 inline-flex h-32 w-32 items-center justify-center rounded-[2rem] bg-primary-container">
        <Sparkles size={56} className="text-primary" />
      </div>
      <h2 className="text-3xl font-bold text-on-surface">You're all set!</h2>
      <p className="mt-4 max-w-xs text-base leading-relaxed text-on-surface-variant">
        Your Pocket Money vault is ready. Start by adding your first transaction or importing bank SMS.
      </p>
      <button
        onClick={finishOnboarding}
        className="mt-12 flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-on-primary"
      >
        Enter the app
        <ArrowRight size={18} />
      </button>
    </div>
  )

  if (screen === 'welcome') return WelcomeScreen()
  if (screen === 'values') return ValuesScreen()
  if (screen === 'theme') return ThemeScreen()
  if (screen === 'choice') return ChoiceScreen()
  if (screen === 'profile') return ProfileScreen()
  if (screen === 'categories') return CategoriesScreen()
  if (screen === 'accounts') return AccountsScreen()
  if (screen === 'goal') return GoalScreen()
  if (screen === 'success') return SuccessScreen()

  return (
    <PermissionsScreen
      onFinish={() => nextScreen('success')}
    />
  )
}

function PermissionsScreen({ onFinish }) {
  const store = useAppStore()
  const [smsGranted, setSmsGranted] = useState(false)
  const [smsAutoImport, setSmsAutoImport] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const accountsExist = store.accounts.length > 0

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const granted = await checkSmsPermission()
      if (cancelled) return
      setSmsGranted(granted)
      if (granted) setSmsAutoImport(true)
      if (!granted) {
        const requested = await requestSmsPermission()
        if (cancelled) return
        setSmsGranted(requested)
        if (requested) setSmsAutoImport(true)
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  const handleSmsPermission = async () => {
    const granted = await requestSmsPermission()
    setSmsGranted(granted)
    if (granted) setSmsAutoImport(true)
  }

  const handleNotificationPermission = async () => {
    const granted = await requestNotificationPermission()
    setNotificationsEnabled(granted)
    if (granted) {
      await scheduleReportNotification(20, 0)
    }
  }

  const handleFinish = async () => {
    setFinishing(true)
    store.updateSettings({
      smsAutoImportEnabled: smsAutoImport && accountsExist,
      notificationsEnabled: notificationsEnabled
    })
    await onFinish()
  }

  return (
    <div className="animate-slide-up flex min-h-[100dvh] flex-col justify-center bg-surface px-6 py-12">
      <div className="absolute top-0 left-0 right-0 z-10 px-6 pt-6">
        <div className="flex items-center justify-between gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i < 9 ? 'bg-primary' : 'bg-surface-variant'
              }`}
            />
          ))}
        </div>
      </div>
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container">
            <Bell size={32} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-on-surface">Enable features</h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            You can manage these anytime in Settings.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleSmsPermission}
            className="flex w-full items-center justify-between rounded-2xl bg-surface p-4 text-left border border-outline-variant"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary-container p-2 text-primary">
                <MessageSquare size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-on-surface">SMS import</p>
                <p className="text-xs text-on-surface-variant">
                  {smsGranted ? (accountsExist ? 'Permission granted' : 'Add an account first') : 'Tap to allow SMS access'}
                </p>
              </div>
            </div>
            <div className={`h-6 w-6 rounded-full border-2 ${smsGranted ? 'border-primary bg-primary' : 'border-outline-variant'}`}>
              {smsGranted && <Check size={14} className="text-on-primary" />}
            </div>
          </button>

          {smsGranted && accountsExist && (
            <div className="flex items-center justify-between rounded-2xl bg-surface p-4 border border-outline-variant">
              <p className="text-sm font-medium text-on-surface">Auto-import bank SMS</p>
              <button
                onClick={() => setSmsAutoImport((v) => !v)}
                className={`relative h-7 w-12 rounded-full transition-colors ${smsAutoImport ? 'bg-primary' : 'bg-surface-variant'}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${smsAutoImport ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          )}

          <button
            onClick={handleNotificationPermission}
            className="flex w-full items-center justify-between rounded-2xl bg-surface p-4 text-left border border-outline-variant"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary-container p-2 text-primary">
                <Bell size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-on-surface">Daily reminder</p>
                <p className="text-xs text-on-surface-variant">{notificationsEnabled ? 'Reminders enabled' : 'Tap to allow notifications'}</p>
              </div>
            </div>
            <div className={`h-6 w-6 rounded-full border-2 ${notificationsEnabled ? 'border-primary bg-primary' : 'border-outline-variant'}`}>
              {notificationsEnabled && <Check size={14} className="text-on-primary" />}
            </div>
          </button>
        </div>

        <button
          onClick={handleFinish}
          disabled={finishing}
          className="mt-8 w-full rounded-2xl bg-primary py-4 text-base font-semibold text-on-primary disabled:opacity-50"
        >
          {finishing ? 'Finishing...' : 'Finish'}
        </button>
      </div>
    </div>
  )
}
