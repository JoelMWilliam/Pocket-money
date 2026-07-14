import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatLKR, getCurrentMonth } from '../lib/utils'
import { getIcon } from '../lib/icons'

import { RegisterModal } from './ModalRoot'

import { useRegisterQuickAdd } from '../contexts/QuickAddContext'

export default function Budgets() {
  useRegisterQuickAdd(() => openNew())
  const { budgets, categories, transactions, addBudget, updateBudget, deleteBudget, getBudgetProgress } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const [form, setForm] = useState({ categoryId: '', amount: '', rollover: false })

  const openNew = () => {
    setEditing(null)
    setForm({ categoryId: categories.find((c) => c.type === 'expense')?.id || '', amount: '', rollover: false })
    setShowForm(true)
  }

  const openEdit = (budget) => {
    setEditing(budget)
    setForm({ categoryId: budget.categoryId, amount: String(budget.amount), rollover: budget.rollover || false })
    setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      categoryId: form.categoryId,
      amount: Number(form.amount) || 0,
      period: 'monthly',
      rollover: form.rollover
    }
    if (editing) {
      updateBudget(editing.id, data)
    } else {
      addBudget(data)
    }
    setShowForm(false)
  }

  const month = getCurrentMonth()

  return (
    <div className="animate-fade-in px-4 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-on-surface-variant">Monthly limits</p>
          <h1 className="text-2xl font-bold text-on-surface">Budgets</h1>
        </div>
      </header>

      <section className="space-y-4">
        {budgets.map((budget) => {
          const category = categories.find((c) => c.id === budget.categoryId)
          const { spent, limit, rolloverAmount, percent } = getBudgetProgress(budget.id)
          const Icon = category?.icon ? getIcon(category.icon) : getIcon('CircleDollarSign')
          const statusColor = percent >= 100 ? 'bg-error' : percent >= 75 ? 'bg-amber-400' : 'bg-primary'

          return (
            <button
              key={budget.id}
              onClick={() => openEdit(budget)}
              className="w-full rounded-2xl bg-surface p-4 text-left border border-outline-variant"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="rounded-xl p-2"
                    style={{ backgroundColor: `${category?.color || '#8e8e93'}22` }}
                  >
                    <Icon size={20} style={{ color: category?.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-on-surface">{category?.name || 'Unknown'}</p>
                    <p className="text-xs text-on-surface-variant">
                      {formatLKR(spent)} of {formatLKR(limit)}
                      {rolloverAmount > 0 && (
                        <span className="ml-1 text-primary">(+{rolloverAmount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} rolled over)</span>
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-on-surface">{Math.round(percent)}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className={`h-full rounded-full transition-all ${statusColor}`}
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
              {percent >= 100 && (
                <p className="mt-2 text-xs text-error">Budget exceeded this month.</p>
              )}
            </button>
          )
        })}
      </section>

      {budgets.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm text-on-surface-variant">No budgets yet.</p>
          <button onClick={openNew} className="mt-3 text-sm text-primary">Create a budget</button>
        </div>
      )}

      {showForm && (
        <>
          <RegisterModal />
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md animate-slide-up rounded-t-3xl bg-surface p-6 pb-24 border-t border-outline-variant"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface">{editing ? 'Edit Budget' : 'New Budget'}</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-full p-2 text-on-surface-variant"
              >
                <X size={20} />
              </button>
            </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Category</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
                  >
                    {categories
                      .filter((c) => c.type === 'expense')
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Monthly Limit (LKR)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
                    placeholder="0.00"
                  />
                </div>

                <label className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface p-3">
                  <input
                    type="checkbox"
                    checked={form.rollover}
                    onChange={(e) => setForm({ ...form, rollover: e.target.checked })}
                    className="h-5 w-5 accent-primary"
                  />
                  <span className="text-sm text-on-surface">Roll over unused balance</span>
                </label>
              </div>

            <div className="mt-6 flex gap-3">
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    deleteBudget(editing.id)
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
                {editing ? 'Save Changes' : 'Create Budget'}
              </button>
            </div>
          </form>
        </div>
        </>
      )}
    </div>
  )
}
