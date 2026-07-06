import { useState, useMemo } from 'react'
import { Plus, X, Trash2, Calendar as CalendarIcon, Zap } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { RegisterModal } from './ModalRoot'
import { formatLKR, todayInputDate } from '../lib/utils'
import * as LucideIcons from 'lucide-react'

const FREQUENCIES = [
  { id: 'weekly', name: 'Weekly' },
  { id: 'biweekly', name: 'Bi-weekly' },
  { id: 'monthly', name: 'Monthly' },
  { id: 'quarterly', name: 'Quarterly' },
  { id: 'yearly', name: 'Yearly' }
]

export default function Recurring() {
  const { recurring, accounts, categories, addTransaction, addRecurring, updateRecurring, deleteRecurring, generateRecurringTransactions } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [generatedCount, setGeneratedCount] = useState(0)

  const [form, setForm] = useState({
    name: '',
    amount: '',
    type: 'expense',
    categoryId: '',
    accountId: '',
    frequency: 'monthly',
    nextDueDate: todayInputDate(),
    reminderDays: '3',
    active: true
  })

  const openNew = () => {
    setEditing(null)
    setForm({
      name: '',
      amount: '',
      type: 'expense',
      categoryId: categories.find((c) => c.type === 'expense')?.id || '',
      accountId: accounts[0]?.id || '',
      frequency: 'monthly',
      nextDueDate: todayInputDate(),
      reminderDays: '3',
      active: true
    })
    setShowForm(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      name: item.name,
      amount: String(item.amount),
      type: item.type,
      categoryId: item.categoryId,
      accountId: item.accountId,
      frequency: item.frequency,
      nextDueDate: item.nextDueDate,
      reminderDays: String(item.reminderDays),
      active: item.active
    })
    setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      ...form,
      amount: Number(form.amount) || 0,
      reminderDays: Number(form.reminderDays) || 0
    }
    if (editing) updateRecurring(editing.id, data)
    else addRecurring(data)
    setShowForm(false)
  }

  const generateTransaction = (item) => {
    addTransaction({
      type: item.type,
      amount: item.amount,
      accountId: item.accountId,
      categoryId: item.categoryId,
      date: todayInputDate(),
      note: item.name
    })
    const next = new Date(item.nextDueDate)
    if (item.frequency === 'weekly') next.setDate(next.getDate() + 7)
    if (item.frequency === 'biweekly') next.setDate(next.getDate() + 14)
    if (item.frequency === 'monthly') next.setMonth(next.getMonth() + 1)
    if (item.frequency === 'quarterly') next.setMonth(next.getMonth() + 3)
    if (item.frequency === 'yearly') next.setFullYear(next.getFullYear() + 1)
    updateRecurring(item.id, { nextDueDate: next.toISOString().slice(0, 10) })
  }

  const handleAutoGenerate = () => {
    const count = generateRecurringTransactions(todayInputDate())
    setGeneratedCount(count)
    setTimeout(() => setGeneratedCount(0), 3000)
  }

  const upcoming = useMemo(() => {
    return [...recurring]
      .filter((r) => r.active)
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
  }, [recurring])

  const totalMonthly = useMemo(() => {
    return recurring
      .filter((r) => r.active && r.type === 'expense')
      .reduce((sum, r) => {
        if (r.frequency === 'monthly') return sum + r.amount
        if (r.frequency === 'weekly') return sum + r.amount * 4.33
        if (r.frequency === 'yearly') return sum + r.amount / 12
        return sum
      }, 0)
  }, [recurring])

  const todayStr = new Date().toISOString().slice(0, 10)
  const next7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  return (
    <div className="animate-fade-in px-4 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-on-surface-variant">Bills & income</p>
          <h1 className="text-2xl font-bold text-on-surface">Recurring</h1>
        </div>
        <button
          onClick={openNew}
          aria-label="Add recurring"
          className="rounded-full bg-primary p-3 text-on-primary shadow-lg shadow-primary/20"
        >
          <Plus size={22} />
        </button>
      </header>

      <section className="mb-5 rounded-3xl bg-surface p-5 border border-outline-variant">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary-container p-3">
              <CalendarIcon size={24} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface-variant">Monthly Commitments</p>
              <p className="text-2xl font-bold text-on-surface">{formatLKR(totalMonthly)}</p>
            </div>
          </div>
          <button
            onClick={handleAutoGenerate}
            className="rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary"
          >
            {generatedCount > 0 ? `${generatedCount} created` : 'Auto-generate'}
          </button>
        </div>
      </section>

      <section className="mb-5">
        <h2 className="mb-3 text-lg font-semibold text-on-surface">Upcoming</h2>
        <div className="space-y-3">
          {upcoming.length > 0 ? (
            upcoming.map((item) => {
              const category = categories.find((c) => c.id === item.categoryId)
              const account = accounts.find((a) => a.id === item.accountId)
              const Icon = category?.icon ? LucideIcons[category.icon] : LucideIcons.CircleDollarSign
              const isDueSoon = item.nextDueDate >= todayStr && item.nextDueDate <= next7Days
              const isOverdue = item.nextDueDate < todayStr

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl bg-surface p-4 border ${
                    isOverdue ? 'border-error' : isDueSoon ? 'border-primary' : 'border-outline-variant'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="rounded-xl p-2"
                        style={{ backgroundColor: `${category?.color || '#8e8e93'}22` }}
                      >
                        <Icon size={20} style={{ color: category?.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-on-surface">{item.name}</p>
                        <p className="text-xs text-on-surface-variant">
                          {account?.name || 'No account'} · {item.frequency}
                        </p>
                        <p className={`mt-1 text-xs ${isOverdue ? 'text-error' : isDueSoon ? 'text-primary' : 'text-on-surface-variant'}`}>
                          Due {item.nextDueDate} {isOverdue ? '(overdue)' : isDueSoon ? '(soon)' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${item.type === 'income' ? 'text-primary' : 'text-on-surface'}`}>
                        {item.type === 'income' ? '+' : '-'}{formatLKR(item.amount)}
                      </p>
                      <button
                        onClick={() => generateTransaction(item)}
                        className="mt-2 flex items-center gap-1 rounded-lg bg-primary-container px-2 py-1 text-[10px] font-medium text-primary"
                      >
                        <Zap size={10} /> Pay
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => openEdit(item)}
                    className="mt-3 text-xs text-on-surface-variant"
                  >
                    Edit
                  </button>
                </div>
              )
            })
          ) : (
            <p className="py-8 text-center text-sm text-on-surface-variant">No recurring items.</p>
          )}
        </div>
      </section>

      {showForm && (
        <>
          <RegisterModal />
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md animate-slide-up rounded-t-3xl bg-surface p-6 border-t border-outline-variant"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface">{editing ? 'Edit Recurring' : 'New Recurring'}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full p-2 text-on-surface-variant">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Name"
                className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-on-surface"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="Amount"
                  className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-on-surface"
                />
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-on-surface"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-on-surface"
                >
                  <option value="">No category</option>
                  {categories
                    .filter((c) => c.type === form.type)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                <select
                  value={form.accountId}
                  onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-on-surface"
                >
                  <option value="">No account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-on-surface"
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <input
                  required
                  type="date"
                  value={form.nextDueDate}
                  onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-on-surface"
                />
              </div>
              <input
                type="number"
                value={form.reminderDays}
                onChange={(e) => setForm({ ...form, reminderDays: e.target.value })}
                placeholder="Reminder days before"
                className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-on-surface"
              />
              <label className="flex items-center gap-3 text-sm text-on-surface">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-5 w-5 rounded border-outline-variant bg-black text-primary"
                />
                Active
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              {editing && (
                <button
                  type="button"
                  onClick={() => { deleteRecurring(editing.id); setShowForm(false) }}
                  className="flex items-center gap-2 rounded-2xl bg-error/20 px-5 py-3 text-sm font-semibold text-error"
                >
                  <Trash2 size={16} /> Delete
                </button>
              )}
              <button type="submit" className="flex-1 rounded-2xl bg-primary py-3 text-sm font-semibold text-on-primary">
                {editing ? 'Save Changes' : 'Add Recurring'}
              </button>
            </div>
          </form>
        </div>
        </>
      )}
    </div>
  )
}
