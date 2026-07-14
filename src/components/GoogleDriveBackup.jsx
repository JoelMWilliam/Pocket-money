import { useState } from 'react'
import { Cloud, CloudOff, RefreshCw, Download, Upload, AlertCircle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { isGoogleDriveConfigured } from '../lib/googleDrive'

const INTERVALS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'onchange', label: 'Every change' },
  { id: 'manual', label: 'Manual only' }
]

export default function GoogleDriveBackup() {
  const settings = useAppStore((state) => state.settings)
  const store = useAppStore()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const configured = isGoogleDriveConfigured()
  const enabled = settings.googleDriveBackupEnabled
  const email = settings.googleDriveBackupEmail
  const interval = settings.googleDriveBackupInterval || 'daily'
  const lastAt = settings.googleDriveBackupLastAt

  const setMsg = (text) => {
    setMessage(text)
    if (text) setTimeout(() => setMessage(''), 4000)
  }

  const handleToggle = async () => {
    if (loading) return
    if (!configured) {
      setMsg('Google Drive is not configured.')
      return
    }
    setLoading(true)
    setMessage('')
    if (enabled) {
      await store.disableGoogleDriveBackup()
      setMsg('Google Drive backup disabled.')
    } else {
      try {
        await store.enableGoogleDriveBackup()
        setMsg('Google Drive backup enabled.')
      } catch (err) {
        setMsg(err.message || 'Failed to sign in to Google Drive.')
      }
    }
    setLoading(false)
  }

  const handleInterval = async (e) => {
    const value = e.target.value
    store.updateSettings({ googleDriveBackupInterval: value })
  }

  const handleBackupNow = async () => {
    setLoading(true)
    setMessage('')
    const res = await store.backupToGoogleDrive(true)
    setMsg(res.success ? 'Backed up to Google Drive.' : res.message)
    setLoading(false)
  }

  const handleRestore = async () => {
    if (!window.confirm('This will replace your current data with the Google Drive backup. Continue?')) return
    setLoading(true)
    setMessage('')
    const res = await store.restoreFromGoogleDrive()
    setMsg(res.success ? 'Restored from Google Drive.' : res.message)
    setLoading(false)
  }

  return (
    <div className="rounded-2xl bg-surface p-4 border border-outline-variant mb-5">
      <div className="mb-3 flex items-center gap-2">
        <Cloud size={18} className="text-primary" />
        <h2 className="text-base font-semibold text-on-surface">Google Drive Backup</h2>
      </div>

      {!configured && (
        <div className="mb-3 rounded-xl bg-amber-400/10 p-3 text-xs text-amber-400">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <p>
              Set <code className="rounded bg-surface px-1 py-0.5">VITE_GOOGLE_WEB_CLIENT_ID</code> in your environment and rebuild to use Google Drive backup.
            </p>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-on-surface">{enabled ? 'Backup enabled' : 'Backup disabled'}</p>
          <p className="text-xs text-on-surface-variant">
            {enabled && email ? `Signed in as ${email}` : 'Keep your data safe in Google Drive'}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading || !configured}
          className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-40 ${enabled ? 'bg-primary' : 'bg-surface-variant'}`}
          aria-label="Toggle Google Drive backup"
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${enabled ? 'left-6' : 'left-1'}`} />
        </button>
      </div>

      {enabled && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-on-surface-variant">Backup interval</label>
            <select
              value={interval}
              onChange={handleInterval}
              disabled={loading}
              className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface disabled:opacity-40"
            >
              {INTERVALS.map((i) => (
                <option key={i.id} value={i.id}>{i.label}</option>
              ))}
            </select>
          </div>

          {lastAt && (
            <p className="text-xs text-on-surface-variant">
              Last backup: {new Date(lastAt).toLocaleString()}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleBackupNow}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-40"
            >
              <Upload size={16} /> Backup now
            </button>
            <button
              onClick={handleRestore}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm font-semibold text-on-surface disabled:opacity-40"
            >
              <Download size={16} /> Restore
            </button>
          </div>

          <button
            onClick={handleToggle}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm font-medium text-error disabled:opacity-40"
          >
            <CloudOff size={16} /> Disconnect Google Drive
          </button>
        </div>
      )}

      {message && (
        <p className={`mt-3 text-center text-xs ${message.includes('Failed') || message.includes('not configured') ? 'text-error' : 'text-primary'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
