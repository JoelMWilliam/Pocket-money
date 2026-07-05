import { useState, useRef, useEffect } from 'react'
import {
  Moon,
  Palette,
  Download,
  Upload,
  X,
  RefreshCcw,
  Info,
  Github,
  ChevronRight,
  Lock,
  Users,
  LogOut,
  Shield,
  FileLock,
  Printer,
  Share2,
  Cloud,
  ArrowUp,
  ArrowDown,
  HeartPulse,
  Fingerprint
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { PRESET_COLORS } from '../lib/theme'
import {
  exportToJSON,
  exportTransactionsToCSV,
  readJSONFile,
  exportEncryptedBackup,
  readEncryptedBackupFile,
} from '../lib/export'
import { extractReceipts, inlineReceipts } from '../lib/receipts'
import { shareFile } from '../lib/share'
import { cloudAuth } from '../lib/api'
import { canUseBiometrics } from '../lib/biometric'

export default function Settings() {
  const {
    auth,
    settings,
    updateSettings,
    accounts,
    categories,
    transactions,
    budgets,
    goals,
    debts,
    recurring,
    investments,
    loans,
    replaceState,
    resetToDemo,
    lock,
    logout,
    deleteUser,
    saveCurrentUserData,
    cloudUser,
    cloudToken,
    lastSyncAt,
    syncStatus,
    setCloudCredentials,
    clearCloudCredentials,
    syncToCloud,
    syncFromCloud,
    enableBiometric,
    disableBiometric
  } = useAppStore()

  const [showCloud, setShowCloud] = useState(false)
  const [cloudForm, setCloudForm] = useState({ username: '', password: '', mode: 'login' })
  const [cloudError, setCloudError] = useState('')
  const [syncMsg, setSyncMsg] = useState('')
  const [health, setHealth] = useState(null)
  const [bioAvailable, setBioAvailable] = useState(false)
  const [bioEnabling, setBioEnabling] = useState(false)

  useEffect(() => {
    setBioAvailable(canUseBiometrics())
  }, [])

  const handleEnableBiometric = async () => {
    setBioEnabling(true)
    try {
      await enableBiometric()
      alert('Biometric authentication enabled.')
    } catch (err) {
      alert(err.message)
    } finally {
      setBioEnabling(false)
    }
  }

  const [showTheme, setShowTheme] = useState(false)
  const [showUsers, setShowUsers] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [pinForm, setPinForm] = useState({ current: '', newPin: '', confirm: '' })
  const [pinError, setPinError] = useState('')
  const fileInputRef = useRef(null)
  const encFileInputRef = useRef(null)

  const [showEncExport, setShowEncExport] = useState(false)
  const [showEncImport, setShowEncImport] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [encFile, setEncFile] = useState(null)
  const [encError, setEncError] = useState('')

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await readJSONFile(file)
      const withRefs = await extractReceipts(data)
      replaceState(withRefs)
      saveCurrentUserData()
      alert('Data imported successfully.')
    } catch (err) {
      alert('Failed to import file. Make sure it is a valid Pocket Money backup.')
    }
  }

  const handleShareBackup = async () => {
    const data = { settings, accounts, categories, transactions, budgets, goals, debts, recurring, investments, loans }
    const withReceipts = await inlineReceipts(data)
    const blob = new Blob([JSON.stringify(withReceipts, null, 2)], { type: 'application/json' })
    const ok = await shareFile(blob, `pocket-money-backup-${new Date().toISOString().slice(0, 10)}.json`, 'Pocket Money Backup')
    if (!ok) exportToJSON(data)
  }

  const handleEncryptedExport = async (e) => {
    e.preventDefault()
    setEncError('')
    if (passphrase.length < 6) return setEncError('Passphrase must be at least 6 characters')
    await exportEncryptedBackup(
      { settings, accounts, categories, transactions, budgets, goals, debts, recurring, investments, loans },
      passphrase
    )
    setShowEncExport(false)
    setPassphrase('')
  }

  const handleEncryptedImport = async (e) => {
    e.preventDefault()
    setEncError('')
    if (!encFile) return setEncError('Select an encrypted backup file')
    try {
      const data = await readEncryptedBackupFile(encFile, passphrase)
      const withRefs = await extractReceipts(data)
      replaceState(withRefs)
      saveCurrentUserData()
      alert('Encrypted backup imported successfully.')
      setShowEncImport(false)
      setPassphrase('')
      setEncFile(null)
    } catch (err) {
      setEncError('Failed to decrypt. Wrong passphrase or corrupt file.')
    }
  }

  const handleCloudSubmit = async (e) => {
    e.preventDefault()
    setCloudError('')
    setSyncMsg('')
    try {
      const res = cloudForm.mode === 'login'
        ? await cloudAuth.login(cloudForm.username, cloudForm.password)
        : await cloudAuth.register(cloudForm.username, cloudForm.password)
      setCloudCredentials(res.username, res.token)
      setSyncMsg('Cloud account connected.')
    } catch (err) {
      setCloudError(err.message)
    }
  }

  const checkDataHealth = () => {
    const issues = []

    transactions.forEach((t) => {
      if (!t.date || isNaN(new Date(t.date).getTime())) issues.push(`Transaction "${t.note || 'unnamed'}" has invalid date`)
      if (!t.amount || t.amount <= 0) issues.push(`Transaction "${t.note || 'unnamed'}" has invalid amount`)
      if (!categories.find((c) => c.id === t.categoryId)) issues.push(`Transaction "${t.note || 'unnamed'}" has unknown category`)
      if (!accounts.find((a) => a.id === t.accountId)) issues.push(`Transaction "${t.note || 'unnamed'}" has unknown account`)
    })

    accounts.forEach((a) => {
      const calculated = transactions.reduce((sum, t) => {
        if (t.accountId === a.id) {
          if (t.type === 'income') return sum + t.amount
          if (t.type === 'expense' || t.type === 'transfer') return sum - t.amount
        }
        if (t.transferTo === a.id) return sum + t.amount
        return sum
      }, 0)
      if (Math.abs((a.balance || 0) - calculated) > 0.01) {
        issues.push(`Account "${a.name}" balance mismatch: stored ${a.balance}, calculated ${calculated}`)
      }
    })

    setHealth({ checkedAt: new Date().toLocaleString(), issues, ok: issues.length === 0 })
  }

  const handleCloudSync = async (direction) => {
    setSyncMsg('')
    try {
      if (direction === 'up') {
        await syncToCloud()
        setSyncMsg('Backed up to cloud.')
      } else {
        await syncFromCloud()
        setSyncMsg('Restored from cloud.')
      }
    } catch (err) {
      setSyncMsg(`Sync failed: ${err.message}`)
    }
  }

  const handlePrintReport = () => {
    const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0)
    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + (t.amount || 0), 0)
    const expense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    const contentHtml = `
      <h1>Pocket Money Report</h1>
      <p>Generated on ${new Date().toLocaleString()}</p>
      <p><strong>Total Balance:</strong> LKR ${totalBalance.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      <p><strong>Total Income:</strong> LKR ${income.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      <p><strong>Total Expenses:</strong> LKR ${expense.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>

      <h2>Accounts</h2>
      <table>
        <tr><th>Name</th><th>Type</th><th>Balance</th></tr>
        ${accounts
          .map(
            (a) =>
              `<tr><td>${a.name}</td><td>${a.type}</td><td>LKR ${(a.balance || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`
          )
          .join('')}
      </table>

      <h2>Recent Transactions</h2>
      <table>
        <tr><th>Date</th><th>Type</th><th>Amount</th><th>Account</th><th>Category</th><th>Note</th></tr>
        ${transactions
          .slice()
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 100)
          .map((t) => {
            const account = accounts.find((a) => a.id === t.accountId)?.name || ''
            const category = categories.find((c) => c.id === t.categoryId)?.name || ''
            return `<tr><td>${t.date}</td><td>${t.type}</td><td>LKR ${(t.amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${account}</td><td>${category}</td><td>${t.note || ''}</td></tr>`
          })
          .join('')}
      </table>
    `
    printReport('Pocket Money Report', contentHtml)
  }

  const handleReset = () => {
    if (confirm('This will erase all your data and restore demo data. Are you sure?')) {
      resetToDemo()
      saveCurrentUserData()
    }
  }

  const handleLogout = () => {
    saveCurrentUserData()
    logout()
  }

  const handleChangePin = async (e) => {
    e.preventDefault()
    setPinError('')
    const { hashPin, verifyPin } = await import('../lib/crypto')
    const user = auth.users[auth.currentUser]
    const valid = await verifyPin(pinForm.current, user.pinHash)
    if (!valid) return setPinError('Current PIN is incorrect')
    if (pinForm.newPin.length < 4) return setPinError('New PIN must be at least 4 digits')
    if (pinForm.newPin !== pinForm.confirm) return setPinError('New PINs do not match')

    const newHash = await hashPin(pinForm.newPin)
    useAppStore.setState((state) => ({
      auth: {
        ...state.auth,
        users: {
          ...state.auth.users,
          [state.auth.currentUser]: {
            ...state.auth.users[state.auth.currentUser],
            pinHash: newHash
          }
        }
      }
    }))
    setShowPin(false)
    setPinForm({ current: '', newPin: '', confirm: '' })
    alert('PIN changed successfully')
  }

  return (
    <div className="animate-fade-in px-4 pt-6">
      <header className="mb-6">
        <p className="text-sm text-on-surface-variant">Preferences</p>
        <h1 className="text-2xl font-bold text-on-surface">Settings</h1>
      </header>

      <section className="mb-5 rounded-2xl bg-surface p-2 border border-outline-variant">
        <button
          onClick={() => setShowTheme(true)}
          className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-surface-bright"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary-container p-2 text-primary">
              <Palette size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">Accent Color</p>
              <p className="text-xs text-on-surface-variant">Customize your app theme</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="h-5 w-5 rounded-full border border-outline"
              style={{ backgroundColor: settings.seedColor }}
            />
            <ChevronRight size={16} className="text-on-surface-variant" />
          </div>
        </button>

        <div className="my-1 h-px bg-outline-variant" />

        <div className="flex items-center justify-between rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary-container p-2 text-primary">
              <Moon size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">Dark Mode</p>
              <p className="text-xs text-on-surface-variant">Always on for AMOLED</p>
            </div>
          </div>
          <button
            onClick={() => updateSettings({ isDark: !settings.isDark })}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              settings.isDark ? 'bg-primary' : 'bg-surface-variant'
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                settings.isDark ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>
      </section>

      <section className="mb-5 rounded-2xl bg-surface p-2 border border-outline-variant">
        <button
          onClick={() => setShowPin(true)}
          className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-surface-bright"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary-container p-2 text-primary">
              <Lock size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">Change PIN</p>
              <p className="text-xs text-on-surface-variant">Update your app lock PIN</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-on-surface-variant" />
        </button>

        <div className="my-1 h-px bg-outline-variant" />

        {bioAvailable && (
          <button
            onClick={auth.users[auth.currentUser]?.biometricEnabled ? disableBiometric : handleEnableBiometric}
            disabled={bioEnabling}
            className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-surface-bright disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary-container p-2 text-primary">
                <Fingerprint size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-on-surface">
                  {auth.users[auth.currentUser]?.biometricEnabled ? 'Disable Biometric' : 'Enable Biometric'}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {auth.users[auth.currentUser]?.biometricEnabled
                    ? 'Use PIN instead of fingerprint/face'
                    : 'Unlock with fingerprint or face recognition'}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-on-surface-variant" />
          </button>
        )}

        <div className="my-1 h-px bg-outline-variant" />

        <button
          onClick={() => setShowUsers(true)}
          className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-surface-bright"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary-container p-2 text-primary">
              <Users size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">Users</p>
              <p className="text-xs text-on-surface-variant">Manage local accounts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-on-surface-variant">{Object.keys(auth.users).length}</span>
            <ChevronRight size={16} className="text-on-surface-variant" />
          </div>
        </button>

        <div className="my-1 h-px bg-outline-variant" />

        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-surface-bright"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-error/20 p-2 text-error">
              <LogOut size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">Log Out</p>
              <p className="text-xs text-on-surface-variant">Lock and switch user</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-on-surface-variant" />
        </button>
      </section>

      <section className="mb-5 rounded-2xl bg-surface p-2 border border-outline-variant">
        <button
          onClick={() => exportToJSON({ settings, accounts, categories, transactions, budgets, goals, debts, recurring, investments, loans })}
          className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-surface-bright"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary-container p-2 text-primary">
              <Download size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">Export Backup (JSON)</p>
              <p className="text-xs text-on-surface-variant">Save all your data to a file</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-on-surface-variant" />
        </button>

        <div className="my-1 h-px bg-outline-variant" />

        <button
          onClick={handleShareBackup}
          className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-surface-bright"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary-container p-2 text-primary">
              <Share2 size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">Share Backup</p>
              <p className="text-xs text-on-surface-variant">Send JSON via native share sheet</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-on-surface-variant" />
        </button>

        <div className="my-1 h-px bg-outline-variant" />

        <button
          onClick={() => exportTransactionsToCSV(transactions, accounts, categories)}
          className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-surface-bright"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary-container p-2 text-primary">
              <Download size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">Export Transactions (CSV)</p>
              <p className="text-xs text-on-surface-variant">Spreadsheet friendly</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-on-surface-variant" />
        </button>

        <div className="my-1 h-px bg-outline-variant" />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-surface-bright"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary-container p-2 text-primary">
              <Upload size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">Import Backup (JSON)</p>
              <p className="text-xs text-on-surface-variant">Restore from a previous backup</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-on-surface-variant" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleImport}
          className="hidden"
        />
      </section>

      <section className="mb-5 rounded-2xl bg-surface p-2 border border-outline-variant">
        <button
          onClick={() => { setEncError(''); setPassphrase(''); setShowEncExport(true) }}
          className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-surface-bright"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary-container p-2 text-primary">
              <FileLock size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">Export Encrypted Backup</p>
              <p className="text-xs text-on-surface-variant">Password-protected JSON</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-on-surface-variant" />
        </button>

        <div className="my-1 h-px bg-outline-variant" />

        <button
          onClick={() => encFileInputRef.current?.click()}
          className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-surface-bright"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary-container p-2 text-primary">
              <Upload size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">Import Encrypted Backup</p>
              <p className="text-xs text-on-surface-variant">Restore from password-protected JSON</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-on-surface-variant" />
        </button>
        <input
          ref={encFileInputRef}
          type="file"
          accept="application/json"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              setEncFile(file)
              setPassphrase('')
              setEncError('')
              setShowEncImport(true)
            }
          }}
          className="hidden"
        />

        <div className="my-1 h-px bg-outline-variant" />

        <button
          onClick={handlePrintReport}
          className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-surface-bright"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary-container p-2 text-primary">
              <Printer size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">Print / Save PDF Report</p>
              <p className="text-xs text-on-surface-variant">Open a printable summary</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-on-surface-variant" />
        </button>
      </section>

      <section className="mb-5 rounded-2xl bg-surface p-2 border border-outline-variant">
        <button
          onClick={handleReset}
          className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-surface-bright"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-error/20 p-2 text-error">
              <RefreshCcw size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">Reset to Demo Data</p>
              <p className="text-xs text-on-surface-variant">Erase everything and start over</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-on-surface-variant" />
        </button>
      </section>

      <section className="mb-5 rounded-2xl bg-surface p-2 border border-outline-variant">
        <button
          onClick={() => { checkDataHealth(); setHealth(null) }}
          className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-surface-bright"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary-container p-2 text-primary">
              <HeartPulse size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">Data Health Check</p>
              <p className="text-xs text-on-surface-variant">Detect balance mismatches and orphan records</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-on-surface-variant" />
        </button>
      </section>

      {health && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-surface p-6 border-t border-outline-variant">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface">Data Health</h2>
              <button onClick={() => setHealth(null)} className="rounded-full p-2 text-on-surface-variant">
                <X size={20} />
              </button>
            </div>

            <p className="mb-3 text-xs text-on-surface-variant">Checked: {health.checkedAt}</p>

            {health.ok ? (
              <div className="rounded-2xl bg-green-400/10 p-4 text-center">
                <p className="text-sm font-semibold text-green-400">All good! No issues found.</p>
              </div>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {health.issues.map((issue, i) => (
                  <div key={i} className="rounded-xl bg-error/10 p-3 text-sm text-error">
                    {issue}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setHealth(null)}
              className="mt-6 w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-on-primary"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <section className="mb-8 rounded-2xl bg-surface p-4 text-center border border-outline-variant">
        <div className="mb-2 flex items-center justify-center gap-2 text-on-surface-variant">
          <Info size={16} />
          <span className="text-xs font-medium">About</span>
        </div>
        <p className="text-sm text-on-surface">Pocket Money v0.2.0</p>
        <p className="mt-1 text-xs text-on-surface-variant">Local-first personal finance. No tracking. No subscriptions.</p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-primary"
          >
            <Github size={14} /> GitHub
          </a>
          <span className="text-xs text-on-surface-variant">MIT License</span>
        </div>
      </section>

      {showTheme && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-surface p-6 border-t border-outline-variant">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface">Accent Color</h2>
              <button
                onClick={() => setShowTheme(false)}
                className="rounded-full p-2 text-on-surface-variant"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => {
                    updateSettings({ seedColor: c.value })
                    setShowTheme(false)
                  }}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-3 transition-colors ${
                    settings.seedColor === c.value
                      ? 'border-primary bg-primary-container'
                      : 'border-outline-variant bg-black'
                  }`}
                >
                  <div
                    className="h-10 w-10 rounded-full"
                    style={{ backgroundColor: c.value }}
                  />
                  <span className="text-xs text-on-surface">{c.name}</span>
                </button>
              ))}
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-xs font-medium text-on-surface-variant">Custom Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.seedColor}
                  onChange={(e) => updateSettings({ seedColor: e.target.value })}
                  className="h-12 w-16 rounded-xl border border-outline-variant bg-transparent"
                />
                <input
                  type="text"
                  value={settings.seedColor}
                  onChange={(e) => updateSettings({ seedColor: e.target.value })}
                  className="flex-1 rounded-xl border border-outline-variant bg-black px-4 py-3 text-sm text-on-surface uppercase"
                />
              </div>
            </div>

            <button
              onClick={() => setShowTheme(false)}
              className="mt-6 w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-on-primary"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {showPin && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleChangePin}
            className="flex w-full max-w-md max-h-[90vh] flex-col animate-slide-up rounded-t-3xl bg-surface border-t border-outline-variant"
          >
            <div className="flex-none p-6 pb-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-bold text-on-surface">Change PIN</h2>
                <button
                  type="button"
                  onClick={() => setShowPin(false)}
                  className="rounded-full p-2 text-on-surface-variant"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mx-auto mb-1 h-1 w-12 rounded-full bg-outline-variant" />
            </div>

            <div className="overflow-y-auto p-6 pt-2 space-y-4">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={pinForm.current}
                onChange={(e) => setPinForm({ ...pinForm, current: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                placeholder="Current PIN"
                className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-center text-xl tracking-widest text-on-surface"
              />
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={pinForm.newPin}
                onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                placeholder="New PIN"
                className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-center text-xl tracking-widest text-on-surface"
              />
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={pinForm.confirm}
                onChange={(e) => setPinForm({ ...pinForm, confirm: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                placeholder="Confirm new PIN"
                className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-center text-xl tracking-widest text-on-surface"
              />

              {pinError && <p className="text-center text-sm text-error">{pinError}</p>}

              <button
                type="submit"
                className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-on-primary"
              >
                Update PIN
              </button>
            </div>
          </form>
        </div>
      )}

      {showUsers && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-surface p-6 border-t border-outline-variant">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface">Users</h2>
              <button
                onClick={() => setShowUsers(false)}
                className="rounded-full p-2 text-on-surface-variant"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {Object.keys(auth.users).map((username) => (
                <div
                  key={username}
                  className="flex items-center justify-between rounded-2xl bg-black p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary-container p-2 text-primary">
                      <Shield size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-on-surface">{username}</p>
                      {username === auth.currentUser && (
                        <p className="text-xs text-primary">Currently active</p>
                      )}
                    </div>
                  </div>
                  {Object.keys(auth.users).length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete user "${username}" and all their data?`)) {
                          deleteUser(username)
                          if (username === auth.currentUser) {
                            setShowUsers(false)
                          }
                        }
                      }}
                      className="text-xs text-error"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => { setShowUsers(false); handleLogout() }}
              className="mt-6 w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-on-primary"
            >
              Switch User
            </button>
          </div>
        </div>
      )}

      {showEncExport && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleEncryptedExport}
            className="w-full max-w-md animate-slide-up rounded-t-3xl bg-surface p-6 border-t border-outline-variant"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface">Export Encrypted Backup</h2>
              <button
                type="button"
                onClick={() => setShowEncExport(false)}
                className="rounded-full p-2 text-on-surface-variant"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mb-3 text-xs text-on-surface-variant">
              Choose a strong passphrase. You will need it to restore this backup.
            </p>

            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Passphrase (min 6 characters)"
              minLength={6}
              className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-sm text-on-surface"
            />

            {encError && <p className="mt-3 text-center text-sm text-error">{encError}</p>}

            <button
              type="submit"
              className="mt-6 w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-on-primary"
            >
              Export Encrypted Backup
            </button>
          </form>
        </div>
      )}

      {showEncImport && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleEncryptedImport}
            className="w-full max-w-md animate-slide-up rounded-t-3xl bg-surface p-6 border-t border-outline-variant"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface">Import Encrypted Backup</h2>
              <button
                type="button"
                onClick={() => setShowEncImport(false)}
                className="rounded-full p-2 text-on-surface-variant"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mb-3 text-xs text-on-surface-variant">
              File: <span className="text-on-surface">{encFile?.name}</span>
            </p>

            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Passphrase"
              className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-sm text-on-surface"
            />

            {encError && <p className="mt-3 text-center text-sm text-error">{encError}</p>}

            <button
              type="submit"
              className="mt-6 w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-on-primary"
            >
              Import Encrypted Backup
            </button>
          </form>
        </div>
      )}
      {showCloud && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-surface p-6 border-t border-outline-variant">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface">Cloud Sync</h2>
              <button
                onClick={() => setShowCloud(false)}
                className="rounded-full p-2 text-on-surface-variant"
              >
                <X size={20} />
              </button>
            </div>

            {cloudUser ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-black p-4">
                  <p className="text-xs text-on-surface-variant">Connected account</p>
                  <p className="text-sm font-semibold text-on-surface">{cloudUser}</p>
                  {lastSyncAt && <p className="mt-1 text-xs text-on-surface-variant">Last sync: {new Date(lastSyncAt).toLocaleString()}</p>}
                </div>

                {syncMsg && <p className="text-center text-sm text-primary">{syncMsg}</p>}

                <div className="flex gap-3">
                  <button
                    onClick={() => handleCloudSync('up')}
                    disabled={syncStatus === 'syncing'}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-on-primary disabled:opacity-50"
                  >
                    <ArrowUp size={16} /> Backup
                  </button>
                  <button
                    onClick={() => handleCloudSync('down')}
                    disabled={syncStatus === 'syncing'}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-outline-variant py-3 text-sm font-semibold text-on-surface disabled:opacity-50"
                  >
                    <ArrowDown size={16} /> Restore
                  </button>
                </div>

                <button
                  onClick={() => { clearCloudCredentials(); setSyncMsg('Disconnected.') }}
                  className="w-full rounded-2xl bg-error/20 py-3 text-sm font-semibold text-error"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <form onSubmit={handleCloudSubmit} className="space-y-4">
                <p className="text-xs text-on-surface-variant">
                  Create a free cloud account to back up and sync across devices. Data is encrypted client-side before transit.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCloudForm({ ...cloudForm, mode: 'login' })}
                    className={`rounded-xl py-2 text-sm font-medium ${cloudForm.mode === 'login' ? 'bg-primary text-on-primary' : 'bg-black text-on-surface'}`}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => setCloudForm({ ...cloudForm, mode: 'register' })}
                    className={`rounded-xl py-2 text-sm font-medium ${cloudForm.mode === 'register' ? 'bg-primary text-on-primary' : 'bg-black text-on-surface'}`}
                  >
                    Register
                  </button>
                </div>

                <input
                  required
                  value={cloudForm.username}
                  onChange={(e) => setCloudForm({ ...cloudForm, username: e.target.value })}
                  placeholder="Username"
                  className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-sm text-on-surface"
                />
                <input
                  required
                  type="password"
                  value={cloudForm.password}
                  onChange={(e) => setCloudForm({ ...cloudForm, password: e.target.value })}
                  placeholder="Password"
                  minLength={8}
                  className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-sm text-on-surface"
                />

                {cloudError && <p className="text-center text-sm text-error">{cloudError}</p>}
                {syncMsg && <p className="text-center text-sm text-primary">{syncMsg}</p>}

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-on-primary"
                >
                  {cloudForm.mode === 'login' ? 'Connect Account' : 'Create Cloud Account'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
