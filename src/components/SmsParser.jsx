import { useState, useEffect } from 'react'
import { X, MessageSquare, Bell, Plus, Check } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatLKR } from '../lib/utils'
import { readNativeSms } from '../lib/biometric'

const BANK_PATTERNS = [
  {
    bank: 'Commercial Bank',
    regex: /(?:credited|debited|withdrawn|paid)\s+(?:Rs\.?|LKR|Rs:)\s*([\d,]+\.?\d*)/i,
    amountRegex: /(?:Rs\.?|LKR|Rs:)\s*([\d,]+\.?\d*)/i,
    noteRegex: /(?:at|from|to|for)\s+([A-Za-z0-9\s&'-]+)/i,
    type: 'expense'
  },
  {
    bank: 'HNB',
    regex: /(?:spent|received|transferred)\s+LKR\s*([\d,]+\.?\d*)/i,
    amountRegex: /LKR\s*([\d,]+\.?\d*)/i,
    noteRegex: /(?:at|to)\s+([A-Za-z0-9\s&'-]+)/i,
    type: 'expense'
  },
  {
    bank: 'Sampath Bank',
    regex: /(?:purchase|withdrawal|deposit)\s+of\s+Rs\.?\s*([\d,]+\.?\d*)/i,
    amountRegex: /Rs\.?\s*([\d,]+\.?\d*)/i,
    noteRegex: /(?:from|at|to)\s+([A-Za-z0-9\s&'-]+)/i,
    type: 'expense'
  }
]

export function parseSmsTransaction(body) {
  const text = body.toLowerCase()
  const isIncome = /credited|received|deposit|salary/.test(text)
  const isTransfer = /transferred|transfer/.test(text)

  for (const pattern of BANK_PATTERNS) {
    if (!pattern.regex.test(body)) continue
    const amountMatch = body.match(pattern.amountRegex)
    if (!amountMatch) continue
    const amount = Number(amountMatch[1].replace(/,/g, ''))
    if (!amount || amount <= 0) continue

    const noteMatch = body.match(pattern.noteRegex)
    const note = noteMatch ? noteMatch[1].trim() : pattern.bank

    const type = isIncome ? 'income' : isTransfer ? 'transfer' : 'expense'

    return { amount, note, type, raw: body }
  }

  return null
}

export default function SmsParser({ onClose }) {
  const { accounts, categories, addTransaction } = useAppStore()
  const [permission, setPermission] = useState('prompt')
  const [messages, setMessages] = useState([])
  const [selected, setSelected] = useState([])
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const native = await readNativeSms()
        if (native.length > 0) {
          const parsed = native
            .map((m) => ({
              ...m,
              date: typeof m.date === 'number' ? new Date(m.date).toISOString() : m.date,
              parsed: parseSmsTransaction(m.body)
            }))
            .filter((m) => m.parsed)
          setMessages(parsed)
          return
        }
      } catch (err) {
        console.error(err)
      }

      if (navigator.sms) {
        navigator.sms.getMessages?.()
          .then((msgs) => {
            const parsed = msgs.map((m) => ({ ...m, parsed: parseSmsTransaction(m.body) })).filter((m) => m.parsed)
            setMessages(parsed)
          })
          .catch(() => setPermission('denied'))
      } else if (window.AndroidSmsReader) {
        window.AndroidSmsReader.readMessages((msgs) => {
          const parsed = msgs.map((m) => ({ ...m, parsed: parseSmsTransaction(m.body) })).filter((m) => m.parsed)
          setMessages(parsed)
        })
      } else {
        setPermission('manual')
      }
    }
    load()
  }, [])

  const handleManualPaste = (e) => {
    const text = e.target.value
    if (!text) return
    const parsed = parseSmsTransaction(text)
    if (parsed) {
      setMessages([{ id: 'manual', body: text, date: new Date().toISOString(), parsed }])
    }
  }

  const toggleSelect = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleImport = () => {
    setImporting(true)
    const toImport = messages.filter((m) => selected.includes(m.id))
    const defaultAccount = accounts[0]?.id
    const defaultCategory = categories.find((c) => c.type === 'expense')?.id

    for (const m of toImport) {
      addTransaction({
        accountId: defaultAccount,
        categoryId: defaultCategory,
        amount: m.parsed.amount,
        type: m.parsed.type,
        date: m.date ? m.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        note: m.parsed.note,
        tags: ['sms-import']
      })
    }

    setImporting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-black p-5 border-t border-outline-variant">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-on-surface">SMS Import</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-on-surface-variant hover:bg-surface">
            <X size={20} />
          </button>
        </div>

        {permission === 'manual' && (
          <div className="mb-4">
            <p className="mb-2 text-xs text-on-surface-variant">Paste a bank SMS below to parse:</p>
            <textarea
              rows={3}
              onChange={handleManualPaste}
              className="w-full rounded-xl border border-outline-variant bg-surface p-3 text-sm text-on-surface"
              placeholder="e.g. Your account has been debited LKR 1,500.00 at Cargills Food City"
            />
          </div>
        )}

        {messages.length === 0 ? (
          <div className="py-8 text-center">
            <Bell size={40} className="mx-auto mb-3 text-on-surface-variant" />
            <p className="text-sm text-on-surface-variant">No bank messages found.</p>
            <p className="mt-1 text-xs text-on-surface-variant">On Android, grant SMS permission to auto-import.</p>
          </div>
        ) : (
          <div className="mb-4 max-h-[50vh] space-y-2 overflow-y-auto">
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
      </div>
    </div>
  )
}
