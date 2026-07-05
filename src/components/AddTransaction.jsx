import { useState, useEffect, useRef } from 'react'
import { X, ArrowRightLeft, ArrowDownLeft, ArrowUpRight, Calendar, Clock, FileText, Camera, Save, Split, Tag, LayoutTemplate, Copy } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { generateId, todayInputDate, nowInputTime } from '../lib/utils'
import { saveReceipt, deleteReceipt, isIndexedDBReceipt, getReceiptIdFromReference, copyReceipt } from '../lib/receipts'
import TagInput from './TagInput'
import SplitEditor from './SplitEditor'
import ReceiptImage from './ReceiptImage'
import * as LucideIcons from 'lucide-react'

const TYPES = [
  { id: 'expense', label: 'Expense', icon: ArrowUpRight },
  { id: 'income', label: 'Income', icon: ArrowDownLeft },
  { id: 'transfer', label: 'Transfer', icon: ArrowRightLeft }
]

export default function AddTransaction({ editing, onClose }) {
  const { accounts, categories, templates, addTransaction, updateTransaction, addTemplate } = useAppStore()

  const [step, setStep] = useState(1)
  const [type, setType] = useState(editing?.type || 'expense')
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [accountId, setAccountId] = useState(editing?.accountId || accounts[0]?.id || '')
  const [transferTo, setTransferTo] = useState(editing?.transferTo || '')
  const [categoryId, setCategoryId] = useState(editing?.categoryId || '')
  const [date, setDate] = useState(editing?.date || todayInputDate())
  const [time, setTime] = useState(editing?.time || nowInputTime())
  const [note, setNote] = useState(editing?.note || '')
  const [receipt, setReceipt] = useState(editing?.receipt || null)
  const [tags, setTags] = useState(editing?.tags || [])
  const [splits, setSplits] = useState(editing?.splits || [])
  const [showSplits, setShowSplits] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const fileInputRef = useRef(null)

  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const incomeCategories = categories.filter((c) => c.type === 'income')
  const transferCategories = categories.filter((c) => c.type === 'transfer')

  const availableCategories =
    type === 'income' ? incomeCategories : type === 'transfer' ? transferCategories : expenseCategories

  useEffect(() => {
    if (!editing && availableCategories.length > 0 && !categoryId) {
      setCategoryId(availableCategories[0].id)
    }
  }, [editing, availableCategories, categoryId])

  useEffect(() => {
    if (editing) {
      setType(editing.type || 'expense')
      setAmount(String(editing.amount || ''))
      setAccountId(editing.accountId || accounts[0]?.id || '')
      setTransferTo(editing.transferTo || '')
      setCategoryId(editing.categoryId || '')
      setDate(editing.date || todayInputDate())
      setTime(editing.time || nowInputTime())
      setNote(editing.note || '')
      setReceipt(editing.receipt || null)
      setTags(editing.tags || [])
      setSplits(editing.splits || [])
      setStep(1)
      setShowSplits(false)
      setShowTemplates(false)
    }
  }, [editing, accounts])

  // When type changes, ensure category belongs to that type
  useEffect(() => {
    if (!availableCategories.find((c) => c.id === categoryId)) {
      setCategoryId(availableCategories[0]?.id || '')
    }
  }, [type, availableCategories, categoryId])

  const handleNumpad = (key) => {
    if (key === 'C') {
      setAmount('')
      return
    }
    if (key === 'back') {
      setAmount(amount.slice(0, -1))
      return
    }
    if (key === '.' && amount.includes('.')) return
    if (amount.replace('.', '').length >= 9) return
    setAmount(amount + key)
  }

  const handleSave = async () => {
    const value = Number(amount)
    if (!value || value <= 0) return
    if (!accountId) return
    if (type === 'transfer' && !transferTo) return

    let finalReceipt = receipt
    if (editing?.receipt && editing.receipt !== receipt) {
      // remove old receipt if replaced
      if (isIndexedDBReceipt(editing.receipt)) {
        try { await deleteReceipt(getReceiptIdFromReference(editing.receipt)) } catch (err) { console.error(err) }
      }
    }

    const data = {
      type,
      amount: value,
      accountId,
      categoryId,
      date,
      time,
      note,
      receipt: finalReceipt,
      tags,
      splits: splits.length > 0 ? splits : undefined,
      transferTo: type === 'transfer' ? transferTo : undefined
    }

    if (editing) {
      updateTransaction(editing.id, data)
    } else {
      addTransaction(data)
    }
    onClose()
  }

  const handleDuplicate = async () => {
    const value = Number(amount)
    if (!value || value <= 0) return
    if (!accountId) return
    if (type === 'transfer' && !transferTo) return

    let finalReceipt = receipt
    if (receipt && editing?.receipt === receipt) {
      // duplicate needs its own copy
      finalReceipt = await copyReceipt(receipt, generateId())
    }

    const data = {
      type,
      amount: value,
      accountId,
      categoryId,
      date,
      time,
      note,
      receipt: finalReceipt,
      tags,
      splits: splits.length > 0 ? splits : undefined
    }
    if (type === 'transfer') data.transferTo = transferTo
    addTransaction(data)
    onClose()
  }

  const handleReceiptCapture = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Limit to ~1.5MB before base64 inflation
    if (file.size > 1.5 * 1024 * 1024) {
      alert('Receipt image too large. Please choose an image under 1.5MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = async (event) => {
      const dataUrl = event.target.result
      const id = generateId()
      try {
        await saveReceipt(id, dataUrl)
        setReceipt(`indexeddb://${id}`)
      } catch (err) {
        console.error('Failed to save receipt', err)
        alert('Failed to save receipt. Storage may be full.')
      }
    }
    reader.readAsDataURL(file)
  }

  const removeReceipt = () => {
    setReceipt(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const applyTemplate = (template) => {
    setType(template.type || 'expense')
    setAmount(template.amount ? String(template.amount) : '')
    setAccountId(template.accountId || '')
    setTransferTo(template.transferTo || '')
    setCategoryId(template.categoryId || '')
    setNote(template.note || '')
    setTags(template.tags || [])
    setSplits(template.splits || [])
    setShowTemplates(false)
  }

  const saveAsTemplate = () => {
    if (!templateName.trim()) return
    addTemplate({
      name: templateName.trim(),
      type,
      amount: Number(amount) || 0,
      accountId,
      transferTo,
      categoryId,
      note,
      tags,
      splits
    })
    setTemplateName('')
    alert('Template saved')
  }

  const numpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back']

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-black border-t border-outline-variant">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
          <h2 className="text-lg font-bold text-on-surface">{editing ? 'Edit' : 'Add'} Transaction</h2>
          <div className="flex items-center gap-1">
            {editing && (
              <button
                onClick={handleDuplicate}
                className="rounded-full p-2 text-on-surface-variant hover:bg-surface"
                title="Duplicate"
              >
                <Copy size={18} />
              </button>
            )}
            <button onClick={onClose} className="rounded-full p-2 text-on-surface-variant hover:bg-surface">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Type selector */}
        <div className="grid grid-cols-3 gap-2 p-4">
          {TYPES.map((t) => {
            const Icon = t.icon
            const active = type === t.id
            return (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={`flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface text-on-surface-variant'
                }`}
              >
                <Icon size={16} /> {t.label}
              </button>
            )
          })}
        </div>

        {step === 1 && (
          <div className="px-5 pb-6">
            <div className="mb-6 text-center">
              <p className="text-sm text-on-surface-variant">Amount</p>
              <p className="mt-2 text-5xl font-bold text-on-surface">LKR {amount || '0.00'}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {numpadKeys.map((key) => (
                <button
                  key={key}
                  onClick={() => handleNumpad(key)}
                  className="rounded-2xl bg-surface py-4 text-xl font-medium text-on-surface active:bg-surface-bright"
                >
                  {key === 'back' ? '⌫' : key}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!Number(amount)}
              className="mt-4 w-full rounded-2xl bg-primary py-3.5 text-base font-semibold text-on-primary disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="h-[60vh] overflow-y-auto px-5 pb-24">
            <div className="mb-4">
              <label className="mb-2 block text-xs font-medium text-on-surface-variant">Account</label>
              <div className="grid grid-cols-2 gap-2">
                {accounts.map((a) => {
                  const Icon = LucideIcons[a.icon] || LucideIcons.Wallet
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAccountId(a.id)}
                      className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-colors ${
                        accountId === a.id
                          ? 'border-primary bg-primary-container'
                          : 'border-outline-variant bg-surface'
                      }`}
                    >
                      <Icon size={18} style={{ color: a.color }} />
                      <span className="truncate text-sm text-on-surface">{a.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {type === 'transfer' && (
              <div className="mb-4">
                <label className="mb-2 block text-xs font-medium text-on-surface-variant">Transfer To</label>
                <div className="grid grid-cols-2 gap-2">
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((a) => {
                      const Icon = LucideIcons[a.icon] || LucideIcons.Wallet
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setTransferTo(a.id)}
                          className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-colors ${
                            transferTo === a.id
                              ? 'border-primary bg-primary-container'
                              : 'border-outline-variant bg-surface'
                          }`}
                        >
                          <Icon size={18} style={{ color: a.color }} />
                          <span className="truncate text-sm text-on-surface">{a.name}</span>
                        </button>
                      )
                    })}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="mb-2 block text-xs font-medium text-on-surface-variant">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {availableCategories.map((c) => {
                  const Icon = LucideIcons[c.icon] || LucideIcons.CircleDollarSign
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(c.id)}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors ${
                        categoryId === c.id
                          ? 'border-primary bg-primary-container'
                          : 'border-outline-variant bg-surface'
                      }`}
                    >
                      <Icon size={20} style={{ color: c.color }} />
                      <span className="text-[10px] leading-tight text-on-surface">{c.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-on-surface-variant">Date</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 pl-9 pr-3 text-sm text-on-surface"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-on-surface-variant">Time</label>
                <div className="relative">
                  <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 pl-9 pr-3 text-sm text-on-surface"
                  />
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-1 block text-xs font-medium text-on-surface-variant">Note</label>
              <div className="relative">
                <FileText size={14} className="absolute left-3 top-3 text-on-surface-variant" />
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What's this for?"
                  className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 pl-9 pr-4 text-sm text-on-surface"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-xs font-medium text-on-surface-variant">Tags</label>
              <TagInput tags={tags} onChange={setTags} />
            </div>

            {type === 'expense' && (
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-medium text-on-surface-variant">Split Transaction</label>
                  <button
                    type="button"
                    onClick={() => setShowSplits(!showSplits)}
                    className="flex items-center gap-1 text-xs text-primary"
                  >
                    <Split size={12} /> {showSplits ? 'Hide' : 'Edit'}
                  </button>
                </div>
                {showSplits && (
                  <SplitEditor
                    total={Number(amount) || 0}
                    splits={splits}
                    categories={categories}
                    onChange={setSplits}
                  />
                )}
              </div>
            )}

            <div className="mb-6">
              <label className="mb-2 block text-xs font-medium text-on-surface-variant">Receipt</label>
              {receipt ? (
                <div className="relative overflow-hidden rounded-2xl border border-outline-variant">
                  <ReceiptImage src={receipt} alt="Receipt" className="h-48 w-full object-cover" />
                  <button
                    type="button"
                    onClick={removeReceipt}
                    className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-outline-variant bg-surface py-6 text-on-surface-variant"
                >
                  <Camera size={20} />
                  <span className="text-sm">Add receipt photo</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleReceiptCapture}
                className="hidden"
              />
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-xs font-medium text-on-surface-variant">Templates</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface py-2.5 text-sm text-on-surface"
                >
                  <LayoutTemplate size={16} /> Load Template
                </button>
                {!editing && Number(amount) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!templateName) {
                        const name = prompt('Template name')
                        if (name) {
                          setTemplateName(name)
                          addTemplate({
                            name,
                            type,
                            amount: Number(amount) || 0,
                            accountId,
                            transferTo,
                            categoryId,
                            note,
                            tags,
                            splits
                          })
                          alert('Template saved')
                        }
                      }
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface py-2.5 text-sm text-on-surface"
                  >
                    <Save size={16} /> Save Template
                  </button>
                )}
              </div>

              {showTemplates && (
                <div className="mt-2 rounded-2xl border border-outline-variant bg-black p-2">
                  {templates.length > 0 ? (
                    templates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => applyTemplate(t)}
                        className="flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-surface"
                      >
                        <span className="text-sm text-on-surface">{t.name}</span>
                        <span className="text-xs text-on-surface-variant">{t.amount > 0 ? `LKR ${t.amount.toFixed(2)}` : t.type}</span>
                      </button>
                    ))
                  ) : (
                    <p className="p-4 text-center text-xs text-on-surface-variant">No templates yet. Save one from this screen.</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-2xl bg-surface py-3.5 text-sm font-semibold text-on-surface"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={!categoryId || (type === 'transfer' && !transferTo)}
                className="flex-1 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-on-primary disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
