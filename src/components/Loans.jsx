import { useState } from 'react'
import { X, Trash2, ArrowRightLeft } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatLKR } from '../lib/utils'
import ModalRoot from './ModalRoot'

import { useRegisterQuickAdd } from '../contexts/QuickAddContext'

export default function Loans() {
  useRegisterQuickAdd(() => openNew())
  const { loans, addLoan, updateLoan, deleteLoan } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    name: '',
    amount: '',
    repaid: '',
    type: 'lent',
    date: '',
    dueDate: '',
    note: ''
  })

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', amount: '', repaid: '', type: 'lent', date: '', dueDate: '', note: '' })
    setShowForm(true)
  }

  const openEdit = (loan) => {
    setEditing(loan)
    setForm({
      name: loan.name,
      amount: String(loan.amount),
      repaid: String(loan.repaid || 0),
      type: loan.type,
      date: loan.date || '',
      dueDate: loan.dueDate || '',
      note: loan.note || ''
    })
    setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      name: form.name,
      amount: Number(form.amount) || 0,
      repaid: Number(form.repaid) || 0,
      type: form.type,
      date: form.date,
      dueDate: form.dueDate,
      note: form.note
    }
    if (editing) {
      updateLoan(editing.id, data)
    } else {
      addLoan(data)
    }
    setShowForm(false)
  }

  const lentTotal = loans
    .filter((l) => l.type === 'lent')
    .reduce((sum, l) => sum + (l.amount - (l.repaid || 0)), 0)
  const borrowedTotal = loans
    .filter((l) => l.type === 'borrowed')
    .reduce((sum, l) => sum + (l.amount - (l.repaid || 0)), 0)

  return (
    <div className="animate-fade-in px-4 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-on-surface-variant">Money lent or borrowed</p>
          <h1 className="text-2xl font-bold text-on-surface">Loans & IOUs</h1>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface p-4 border border-outline-variant">
          <p className="text-xs text-on-surface-variant">Lent to others</p>
          <p className="text-lg font-bold text-green-400">{formatLKR(lentTotal)}</p>
        </div>
        <div className="rounded-2xl bg-surface p-4 border border-outline-variant">
          <p className="text-xs text-on-surface-variant">Borrowed</p>
          <p className="text-lg font-bold text-error">{formatLKR(borrowedTotal)}</p>
        </div>
      </section>

      <div className="mb-4 rounded-2xl border border-outline-variant bg-surface p-3">
        <p className="text-xs text-on-surface-variant">
          For formal loans, credit cards, and interest-based payoff plans with Avalanche / Snowball strategies, use the <span className="font-semibold text-primary">Debts</span> screen.
        </p>
      </div>

      <section className="space-y-3">
        {loans.map((loan) => {
          const remaining = loan.amount - (loan.repaid || 0)
          const progress = loan.amount > 0 ? Math.min(((loan.repaid || 0) / loan.amount) * 100, 100) : 0
          return (
            <button
              key={loan.id}
              onClick={() => openEdit(loan)}
              className="w-full rounded-2xl bg-surface p-4 text-left border border-outline-variant"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`rounded-full p-2 ${loan.type === 'lent' ? 'bg-green-400/20 text-green-400' : 'bg-error/20 text-error'}`}>
                    <ArrowRightLeft size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-on-surface">{loan.name}</p>
                    <p className="text-xs text-on-surface-variant capitalize">{loan.type} · {loan.date}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-on-surface">{formatLKR(remaining)}</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-on-surface-variant">
                {formatLKR(loan.repaid || 0)} repaid of {formatLKR(loan.amount)}
              </p>
            </button>
          )
        })}
      </section>

      {loans.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm text-on-surface-variant">No loans or IOUs yet.</p>
          <button onClick={openNew} className="mt-3 text-sm text-primary">Track money lent/borrowed</button>
        </div>
      )}

      {showForm && (
        <ModalRoot>
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md animate-slide-up rounded-t-3xl bg-surface p-6 border-t border-outline-variant"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface">{editing ? 'Edit Loan' : 'New Loan'}</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-full p-2 text-on-surface-variant"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface"
                  >
                    <option value="lent">I lent</option>
                    <option value="borrowed">I borrowed</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Person / Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Kasun"
                    className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Total Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Repaid</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.repaid}
                    onChange={(e) => setForm({ ...form, repaid: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Due Date (optional)</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-on-surface-variant">Note</label>
                <input
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Optional details"
                  className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    deleteLoan(editing.id)
                    setShowForm(false)
                  }}
                  className="flex items-center gap-2 rounded-2xl bg-error/20 px-5 py-3 text-sm font-semibold text-error"
                >
                  <Trash2 size={16} /> Delete
                </button>
              )}
              <button
                type="submit"
                className="flex-1 rounded-2xl bg-primary py-3 text-sm font-semibold text-on-primary"
              >
                {editing ? 'Save Changes' : 'Add Loan'}
              </button>
            </div>
          </form>
        </div>
        </ModalRoot>
      )}
    </div>
  )
}
