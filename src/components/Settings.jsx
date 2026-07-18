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
  Share2,
  Cloud,
  ArrowUp,
  ArrowDown,
  HeartPulse,
  Fingerprint,
  Bell,
  FileText,
  Mail,
  MessageSquare
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { PRESET_COLORS } from '../lib/theme'
import {
  exportToJSON,
  exportTransactionsToCSV,
  readJSONFile,
  exportEncryptedBackup,
  readEncryptedBackupFile,
  validateBackupData,
  sanitizeImportedSettings
} from '../lib/export'
import { extractReceipts } from '../lib/receipts'
import { cloudAuth } from '../lib/api'
import { exportPDFReport } from '../lib/pdf'
import { buildEmailReport, sendEmailReport } from '../lib/email'
import { canUseBiometrics } from '../lib/biometric'
import { requestNotificationPermission, scheduleDailyReminder, scheduleReportNotification, cancelAllNotifications } from '../lib/notifications'
import { maybeAutoImportSms } from '../lib/sms'
import { RegisterModal } from './ModalRoot'
import AvatarPicker from './AvatarPicker'
import GoogleDriveBackup from './GoogleDriveBackup'
import SmsParser from './SmsParser'

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
    updateUserSettings,
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

  const notificationsEnabled = settings.notificationsEnabled || false
  const reportHour = settings.reportHour ?? 20
  const reportMinute = settings.reportMinute ?? 0

  useEffect(() => {
    canUseBiometrics().then(setBioAvailable)
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

  const toggleDailyReminder = async () => {
    if (notificationsEnabled) {
      await cancelAllNotifications()
      updateSettings({ notificationsEnabled: false })
    } else {
      const granted = await requestNotificationPermission()
      if (granted) {
        await scheduleReportNotification(reportHour, reportMinute)
        updateSettings({ notificationsEnabled: true })
        const h = String(reportHour).padStart(2, '0')
        const m = String(reportMinute).padStart(2, '0')
        alert(`Daily reminder enabled at ${h}:${m}.`)
      } else {
        alert('Notification permission denied.')
      }
    }
  }

  const handleReportTimeChange = async (hour, minute) => {
    updateSettings({ reportHour: hour, reportMinute: minute })
    if (notificationsEnabled) {
      await scheduleReportNotification(hour, minute)
    }
  }

  const handleToggleSmsAutoImport = () => {
    updateSettings({ smsAutoImportEnabled: !settings.smsAutoImportEnabled })
  }

  const handleImportSmsNow = async () => {
    try {
      const imported = await maybeAutoImportSms(useAppStore.getState())
      alert(imported.length > 0 ? `Imported ${imported.length} transaction(s).` : 'No new bank SMS found.')
    } catch (err) {
      alert(err.message || 'SMS import failed.')
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
  const [smsOpen, setSmsOpen] = useState(false)

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await readJSONFile(file)
      validateBackupData(data)
      const safeData = {
        ...data,
        settings: sanitizeImportedSettings(data.settings || {}, settings)
      }
      const withRefs = await extractReceipts(safeData)
      replaceState(withRefs)
      saveCurrentUserData()
      alert('Data imported successfully.')
    } catch (err) {
      alert('Failed to import file. ' + err.message)
    }
  }

  const handleShareBackup = async () => {
    try {
      await exportToJSON({ settings, accounts, categories, transactions, budgets, goals, debts, recurring, investments, loans })
    } catch (err) {
      alert('Share failed. ' + err.message)
    }
  }

  const handleEncryptedExport = async (e) => {
    e.preventDefault()
    setEncError('')
    if (passphrase.length < 6) return setEncError('Passphrase must be at least 6 characters')
    try {
      await exportEncryptedBackup(
        { settings, accounts, categories, transactions, budgets, goals, debts, recurring, investments, loans },
        passphrase
      )
      setShowEncExport(false)
      setPassphrase('')
    } catch (err) {
      setEncError('Export failed. Please try again.')
    }
  }

  const handleEncryptedImport = async (e) => {
    e.preventDefault()
    setEncError('')
    if (!encFile) return setEncError('Select an encrypted backup file')
    try {
      const data = await readEncryptedBackupFile(encFile, passphrase)
      validateBackupData(data)
      const safeData = {
        ...data,
        settings: sanitizeImportedSettings(data.settings || {}, settings)
      }
      const withRefs = await extractReceipts(safeData)
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
      }, a.initialBalance || 0)
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

  const handleExportPDF = async () => {
    try {
      await exportPDFReport({
        settings,
        accounts,
        categories,
        transactions,
        budgets,
        goals,
        debts,
        recurring,
        investments,
        loans
      })
    } catch (err) {
      alert('Failed to export PDF. ' + err.message)
    }
  }

  const handleEmailReport = async () => {
    try {
      const data = {
        settings,
        accounts,
        categories,
        transactions,
        budgets,
        goals,
        debts,
        recurring,
        investments,
        loans
      }
      const { subject, html, text } = buildEmailReport(data)
      const ok = await sendEmailReport({ subject, html, text })
      if (!ok) alert('No email app available.')
    } catch (err) {
      alert('Failed to prepare email. ' + err.message)
    }
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

      <section className="mb-5 rounded-2xl bg-surface p-4 text-center border border-outline-variant">
        <AvatarPicker
          value={auth.users[auth.currentUser]?.avatar}
          onChange={(avatar) => updateUserSettings(auth.currentUser, { avatar })}
          size={96}
        />
        <h2 className="mt-3 text-lg font-bold text-on-surface">{auth.currentUser}</h2>
        <p className="text-xs text-on-surface-variant">Tap avatar to change</p>
      </section>

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

        <div className="rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary-container p-2 text-primary">
                <Bell size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-on-surface">Daily Reminder</p>
                <p className="text-xs text-on-surface-variant">
                  {notificationsEnabled
                    ? `Daily summary at ${String(reportHour).padStart(2, '0')}:${String(reportMinute).padStart(2, '0')}`
                    : 'Tap to enable'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleDailyReminder}
              className={`relative h-7 w-12 rounded-full transition-colors ${notificationsEnabled ? 'bg-primary' : 'bg-surface-variant'}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${notificationsEnabled ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {notificationsEnabled && (
            <div className="mt-3 flex items-center gap-3">
              <label className="text-xs font-medium text-on-surface-variant w-20">Remind at:</label>
              <div className="flex items-center gap-1">
                <select
                  value={reportHour}
                  onChange={(e) => handleReportTimeChange(Number(e.target.value), reportMinute)}
                  className="rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                  ))}
                </select>
                <span className="text-sm text-on-surface-variant">:</span>
                <select
                  value={reportMinute}
                  onChange={(e) => handleReportTimeChange(reportHour, Number(e.target.value))}
                  className="rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
                >
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

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
          onClick={() => { setCloudError(''); setSyncMsg(''); setShowCloud(true) }}
          className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-surface-bright"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary-container p-2 text-primary">
              <Cloud size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">Cloud Sync</p>
              <p className="text-xs text-on-surface-variant">{cloudUser ? `Connected as ${cloudUser}` : 'Back up and sync across devices'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {cloudUser && <span className="h-2 w-2 rounded-full bg-primary" />}
            <ChevronRight size={16} className="text-on-surface-variant" />
          </div>
        </button>

        <div className="my-1 h-px bg-outline-variant" />

        <button
          onClick={() => exportToJSON({ settings, accounts, categories, transactions, budgets, goals, debts, recurring, investments, loans }).catch((err) => alert('Export failed. ' + err.message))}
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
          onClick={() => exportTransactionsToCSV(transactions, accounts, categories).catch((err) => alert('CSV export failed. ' + err.message))}
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
          onClick={handleExportPDF}
          className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-surface-bright"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary-container p-2 text-primary">
              <FileText size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">Export PDF Report</p>
              <p className="text-xs text-on-surface-variant">Download a formatted PDF summary</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-on-surface-variant" />
        </button>

        <div className="my-1 h-px bg-outline-variant" />

        <button
          onClick={handleEmailReport}
          className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-surface-bright"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary-container p-2 text-primary">
              <Mail size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">Email Monthly Report</p>
              <p className="text-xs text-on-surface-variant">Send a summary via your email app</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-on-surface-variant" />
        </button>
      </section>

      <section className="mb-5 rounded-2xl bg-surface p-2 border border-outline-variant">
        <button
          onClick={() => setSmsOpen(true)}
          className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-surface-bright"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary-container p-2 text-primary">
              <MessageSquare size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">Import SMS</p>
              <p className="text-xs text-on-surface-variant">Manually import bank transactions from SMS</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-on-surface-variant" />
        </button>

        <div className="my-1 h-px bg-outline-variant" />

        <div className="flex items-center justify-between rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary-container p-2 text-primary">
              <RefreshCcw size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">Auto-import SMS</p>
              <p className="text-xs text-on-surface-variant">Import new bank SMS on app launch</p>
            </div>
          </div>
          <button
            onClick={handleToggleSmsAutoImport}
            className={`relative h-7 w-12 rounded-full transition-colors ${settings.smsAutoImportEnabled ? 'bg-primary' : 'bg-surface-variant'}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${settings.smsAutoImportEnabled ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
      </section>

      <GoogleDriveBackup />

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
          onClick={checkDataHealth}
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
        <>
          <RegisterModal />
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
        </>
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
        <>
          <RegisterModal />
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
                  data-color={c.value}
                  onClick={() => {
                    updateSettings({ seedColor: c.value })
                    setShowTheme(false)
                  }}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-3 transition-colors ${
                    settings.seedColor === c.value
                      ? 'border-primary bg-primary-container'
                      : 'border-outline-variant bg-surface'
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
                  className="flex-1 rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface uppercase"
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
        </>
      )}

      {showPin && (
        <>
          <RegisterModal />
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
                className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-center text-xl tracking-widest text-on-surface"
              />
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={pinForm.newPin}
                onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                placeholder="New PIN"
                className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-center text-xl tracking-widest text-on-surface"
              />
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={pinForm.confirm}
                onChange={(e) => setPinForm({ ...pinForm, confirm: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                placeholder="Confirm new PIN"
                className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-center text-xl tracking-widest text-on-surface"
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
        </>
      )}

      {showUsers && (
        <>
          <RegisterModal />
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
                  className="flex items-center justify-between rounded-2xl bg-surface p-4"
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
        </>
      )}

      {showEncExport && (
        <>
          <RegisterModal />
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
              className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface"
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
        </>
      )}

      {showEncImport && (
        <>
          <RegisterModal />
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
              className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface"
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
        </>
      )}

      {showCloud && (
        <>
          <RegisterModal />
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
                <div className="rounded-xl bg-surface p-4">
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
                    className={`rounded-xl py-2 text-sm font-medium ${cloudForm.mode === 'login' ? 'bg-primary text-on-primary' : 'bg-surface text-on-surface'}`}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => setCloudForm({ ...cloudForm, mode: 'register' })}
                    className={`rounded-xl py-2 text-sm font-medium ${cloudForm.mode === 'register' ? 'bg-primary text-on-primary' : 'bg-surface text-on-surface'}`}
                  >
                    Register
                  </button>
                </div>

                <input
                  required
                  value={cloudForm.username}
                  onChange={(e) => setCloudForm({ ...cloudForm, username: e.target.value })}
                  placeholder="Username"
                  className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface"
                />
                <input
                  required
                  type="password"
                  value={cloudForm.password}
                  onChange={(e) => setCloudForm({ ...cloudForm, password: e.target.value })}
                  placeholder="Password"
                  minLength={8}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface"
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
        </>
      )}

      {smsOpen && <SmsParser onClose={() => setSmsOpen(false)} />}
    </div>
  )
}
