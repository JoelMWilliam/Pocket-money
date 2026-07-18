import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { X, MessageSquare, Bell, Plus, Check, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatLKR } from '../lib/utils'
import {
  requestSmsPermission,
  readSmsMessages,
  importSmsMessages,
  parseSmsTransaction,
  isNativeSmsAvailable
} from '../lib/sms'
import { autoCategorize } from '../lib/merchantRules'
import { extractReferenceNumber } from '../lib/sms'
import { useRegisterModal } from '../contexts/ModalContext'

export { parseSmsTransaction }

export default function SmsParser({ onClose }) {
  useRegisterModal()
  const store = useAppStore()
  const isNative = isNativeSmsAvailable()
  const [permission, setPermission] = useState('prompt')
  const [rawMessages, setRawMessages] = useState([])
  const [messages, setMessages] = useState([])
  const [selected, setSelected] = useState([])
  const [importing, setImporting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showRaw, setShowRaw] = useState(false)
  const [autoImportEnabled, setAutoImportEnabled] = useState(store.settings.smsAutoImportEnabled || false)
  const [statusMsg, setStatusMsg] = useState('')
  const [diagnostic, setDiagnostic] = useState('')
  const [manualText, setManualText] = useState('')
  const [manualParsed, setManualParsed] = useState(null)

  useEffect(() => {
    if (isNative) {
      loadNativeMessages()
    } else {
      setPermission('manual')
      setDiagnostic('Manual mode: paste a bank SMS below.')
    }
  }, [isNative])

  const loadNativeMessages = async () => {
    setLoading(true)
    setStatusMsg('')
    setDiagnostic('')
    try {
      const granted = await requestSmsPermission()
      setPermission(granted ? 'granted' : 'denied')
      if (!granted) {
        setLoading(false)
        setDiagnostic('SMS permission denied. Tap the refresh button after allowing it in Android Settings.')
        return
      }
      const native = await readSmsMessages()
      setRawMessages(native)

      const parsed = native
        .map((m) => ({
          ...m,
          date: typeof m.date === 'number' ? new Date(m.date).toISOString() : m.date,
          parsed: parseSmsTransaction(m.body)
        }))
        .filter((m) => m.parsed)

      setMessages(parsed)
      setDiagnostic(`Read ${native.length} SMS messages. ${parsed.length} matched a bank transaction.`)

      if (parsed.length === 0 && native.length > 0) {
        setStatusMsg(`${native.length} messages read, but none matched a bank transaction pattern. Show raw messages to inspect them.`)
      }
      if (native.length === 0) {
        setStatusMsg('No SMS messages found in the inbox.')
      }
    } catch (err) {
      console.error(err)
      setStatusMsg(`Error: ${err.message || 'Could not read SMS'}`)
      setDiagnostic(`Error: ${err.message || 'Could not read SMS'}`)
      setPermission('manual')
    } finally {
      setLoading(false)
    }
  }

  const handleManualPaste = (e) => {
    const text = e.target.value
    setManualText(text)
    if (!text) {
      setManualParsed(null)
      return
    }
    const parsed = parseSmsTransaction(text)
    setManualParsed(parsed)
    if (!parsed) {
      setDiagnostic('No bank transaction pattern matched in the pasted text.')
    }
  }

  const handleImportManual = async () => {
    if (!manualParsed) return
    setImporting(true)
    const res = await importSmsMessages([{ id: 'manual', body: manualText, date: new Date().toISOString(), parsed: manualParsed }], store)
    setImporting(false)
    showResultSummary(res)
    const ok = res.imported.length > 0
    if (ok || res.unmatched.length === 0) onClose()
  }

  const toggleSelect = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const [importSummary, setImportSummary] = useState(null)

  const showResultSummary = (res) => {
    if (!res) return
    const lines = []
    if (res.imported.length > 0) lines.push(`Imported ${res.imported.length}`)
    if (res.duplicates.length > 0) lines.push(`Duplicates skipped ${res.duplicates.length}`)
    if (res.unmatched.length > 0) lines.push(`Unmatched ${res.unmatched.length}`)
    if (res.errors.length > 0) lines.push(`Errors ${res.errors.length}`)
    setImportSummary({
      text: lines.join(' · '),
      details: res,
      unmatchedList: res.unmatched
    })
  }

  const handleImport = async () => {
    setImporting(true)
    const toImport = messages.filter((m) => selected.includes(m.id))
    const res = await importSmsMessages(toImport, store)
    setImporting(false)
    showResultSummary(res)
    if (res.unmatched.length === 0 && res.errors.length === 0 && res.duplicates.length === 0) {
      onClose()
    }
  }

  // Manually assign an unmatched SMS to an account.
  const handleAssignUnmatched = async (item, accountId) => {
    if (!accountId) return
    const parsed = item.parsed
    const prefill = {
      accountId,
      amount: parsed.amount,
      type: parsed.type,
      date: item.date,
      note: parsed.note,
      tags: ['sms-import', 'manual-assign'],
      smsAddress: item.address || '',
      smsRefNo: extractReferenceNumber(item.body) || null
    }
    const categorized = autoCategorize(prefill)
    store.addTransaction(categorized)
    setImportSummary((prev) => {
      if (!prev) return prev
      const remaining = prev.unmatchedList.filter((u) => u.messageId !== item.messageId)
      return { ...prev, unmatchedList: remaining }
    })
  }

  const handleToggleAutoImport = async () => {
    const next = !autoImportEnabled
    setAutoImportEnabled(next)
    store.updateSettings({ smsAutoImportEnabled: next })
    if (next) {
      await loadNativeMessages()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex w-full max-w-md max-h-[85vh] flex-col animate-slide-up rounded-t-3xl bg-surface border-t border-outline-variant">
        <div className="flex-none p-5 pb-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={20} className="text-primary" />
              <h2 className="text-lg font-bold text-on-surface">SMS Import</h2>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-on-surface-variant hover:bg-surface">
              <X size={20} />
            </button>
          </div>
          <div className="mx-auto mb-1 h-1 w-12 rounded-full bg-outline-variant" />
        </div>

        <div className="overflow-y-auto p-5 pt-2">
          {isNative && (
            <div className="mb-4 rounded-2xl bg-surface p-4 border border-outline-variant">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary-container p-2 text-primary">
                    <Bell size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-on-surface">Auto-import SMS</p>
                    <p className="text-xs text-on-surface-variant">Add new bank SMS on app launch</p>
                  </div>
                </div>
                <button
                  onClick={handleToggleAutoImport}
                  className={`relative h-7 w-12 rounded-full transition-colors ${autoImportEnabled ? 'bg-primary' : 'bg-surface-variant'}`}
                >
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${autoImportEnabled ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>
          )}

          {diagnostic && (
            <div className="mb-4 rounded-2xl bg-surface p-3 text-xs text-on-surface-variant border border-outline-variant">
              {diagnostic}
            </div>
          )}

          <div className="mb-4">
            <p className="mb-2 text-xs text-on-surface-variant">Paste a bank SMS below to test the parser:</p>
            <textarea
              rows={3}
              value={manualText}
              onChange={handleManualPaste}
              className="w-full rounded-xl border border-outline-variant bg-surface p-3 text-sm text-on-surface"
              placeholder="e.g. Your account has been debited LKR 1,500.00 at Cargills Food City"
            />
            {manualParsed && (
              <div className="mt-2 rounded-xl bg-primary-container p-3 text-sm text-on-surface">
                <p className="font-medium">Parsed: {manualParsed.note}</p>
                <p className="text-xs text-on-surface-variant">{formatLKR(manualParsed.amount)} · {manualParsed.type}</p>
                <button
                  onClick={handleImportManual}
                  className="mt-2 w-full rounded-xl bg-primary py-2 text-xs font-semibold text-on-primary"
                >
                  Import this transaction
                </button>
              </div>
            )}
          </div>

          {permission === 'denied' && (
            <div className="mb-4 rounded-2xl bg-error/10 p-4 text-sm text-error">
              <p className="font-medium">SMS permission denied</p>
              <p className="mt-1 text-xs opacity-90">
                Go to Android Settings → Apps → Pocket Money → Permissions → SMS → Allow.
              </p>
            </div>
          )}

          {isNative && permission !== 'denied' && (
            <button
              onClick={loadNativeMessages}
              disabled={loading}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-surface px-4 py-2.5 text-sm font-medium text-on-surface border border-outline-variant disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Reading SMS...' : 'Refresh SMS inbox'}
            </button>
          )}

          {statusMsg && (
            <div className="mb-4 rounded-2xl bg-amber-400/10 p-3 text-xs text-amber-400">
              {statusMsg}
            </div>
          )}

          {loading && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-on-surface-variant">Reading messages...</p>
            </div>
          )}

          {!loading && rawMessages.length > 0 && (
            <button
              onClick={() => setShowRaw((v) => !v)}
              className="mb-4 flex items-center gap-1 text-xs text-primary"
            >
              {showRaw ? <EyeOff size={14} /> : <Eye size={14} />}
              {showRaw ? 'Hide raw messages' : `Show ${rawMessages.length} raw messages`}
            </button>
          )}

          {showRaw && rawMessages.length > 0 && (
            <div className="mb-4 space-y-2">
              {rawMessages.map((m) => (
                <div key={m.id} className="rounded-xl bg-surface p-3 text-xs text-on-surface border border-outline-variant">
                  <p className="text-on-surface-variant">{new Date(m.date).toLocaleString()} · {m.address}</p>
                  <p className="mt-1">{m.body}</p>
                </div>
              ))}
            </div>
          )}

          {!loading && messages.length === 0 && permission !== 'denied' && (
            <div className="py-8 text-center">
              <Bell size={40} className="mx-auto mb-3 text-on-surface-variant" />
              <p className="text-sm text-on-surface-variant">No bank transactions found.</p>
            </div>
          )}

          {messages.length > 0 && (
            <div className="mb-4 space-y-2">
              {messages.map((m) => (
                <button
                  key={m.id}
                  onClick={() => toggleSelect(m.id)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left ${
                    selected.includes(m.id) ? 'border-primary bg-primary-container' : 'border-outline-variant bg-surface'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-on-surface">{m.parsed.note}</p>
                    <p className="text-xs text-on-surface-variant">{formatLKR(m.parsed.amount)} · {m.parsed.type}</p>
                  </div>
                  {selected.includes(m.id) ? <Check size={18} className="text-primary" /> : <Plus size={18} className="text-on-surface-variant" />}
                </button>
              ))}
            </div>
          )}

          {selected.length > 0 && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="w-full rounded-2xl bg-primary py-3.5 text-base font-semibold text-on-primary disabled:opacity-50"
            >
              {importing ? 'Importing...' : `Import ${selected.length} Transactions`}
            </button>
          )}

          {importSummary && (
            <div className="mt-4 rounded-2xl border border-outline-variant bg-surface p-4">
              <p className="text-sm font-semibold text-on-surface">{importSummary.text}</p>
              {importSummary.unmatchedList.length > 0 && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-on-surface-variant">These couldn't be matched automatically. Pick an account for each.</p>
                  {importSummary.unmatchedList.map((u) => {
                    const candidates = (store.accounts || []).filter((a) =>
                      !u.candidateAccountIds?.length || u.candidateAccountIds.includes(a.id)
                    )
                    return (
                      <div key={u.messageId} className="rounded-xl border border-outline-variant bg-surface p-3">
                        <p className="text-sm font-medium text-on-surface truncate">{u.parsed?.note || 'Untitled'}</p>
                        <p className="text-xs text-on-surface-variant">{formatLKR(u.parsed?.amount || 0)} · {u.parsed?.type}</p>
                        <p className="mt-1 text-[10px] text-on-surface-variant/80">{u.reason}</p>
                        <select
                          defaultValue=""
                          onChange={(e) => { if (e.target.value) handleAssignUnmatched(u, e.target.value) }}
                          className="mt-2 w-full rounded-xl border border-outline-variant bg-surface-bright px-3 py-2 text-xs text-on-surface"
                        >
                          <option value="">Assign to account…</option>
                          {candidates.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                          {store.accounts.filter((a) => !candidates.includes(a)).map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      </div>
                    )
                  })}
                </div>
              )}
              <button
                onClick={() => { setImportSummary(null); onClose() }}
                className="mt-3 w-full rounded-xl bg-primary py-2.5 text-xs font-semibold text-on-primary"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
