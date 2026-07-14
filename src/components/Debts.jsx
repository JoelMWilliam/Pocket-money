import { useState, useMemo } from 'react'
import { X, Trash2, TrendingDown, Calculator, ArrowRight } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { RegisterModal } from './ModalRoot'
import { formatLKR } from '../lib/utils'

const STRATEGIES = [
  { id: 'avalanche', name: 'Avalanche', desc: 'Highest interest first' },
  { id: 'snowball', name: 'Snowball', desc: 'Smallest balance first' },
  { id: 'custom', name: 'Custom', desc: 'Your own priority' }
]

function calculatePayoff(remaining, totalMonthly, strategy) {
  const projection = []
  let month = 0
  const maxMonths = 120
  let interestPaid = 0

  while (remaining.some((d) => d.currentBalance > 0) && month < maxMonths) {
    month++
    const ordered = [...remaining].sort((a, b) => {
      if (strategy === 'avalanche') return b.interestRate - a.interestRate
      if (strategy === 'snowball') return a.currentBalance - b.currentBalance
      return 0
    })

    let available = totalMonthly
    for (const debt of ordered) {
      if (debt.currentBalance <= 0) continue
      const interest = (debt.currentBalance * (debt.interestRate / 100)) / 12
      interestPaid += interest
      debt.currentBalance += interest
      const payment = Math.min(available, Math.max(debt.minimumPayment, debt.currentBalance))
      debt.currentBalance = Math.max(0, debt.currentBalance - payment)
      available -= payment
    }

    projection.push({
      month,
      total: remaining.reduce((sum, d) => sum + d.currentBalance, 0)
    })
  }

  return { months: month, projection, interestPaid }
}

import { useRegisterQuickAdd } from '../contexts/QuickAddContext'

export default function Debts() {
  useRegisterQuickAdd(() => openNew())
  const { debts, addDebt, updateDebt, deleteDebt } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [extraPayment, setExtraPayment] = useState('')
  const [selectedStrategy, setSelectedStrategy] = useState('avalanche')

  const [form, setForm] = useState({
    name: '',
    principal: '',
    balance: '',
    interestRate: '',
    minimumPayment: '',
    strategy: 'avalanche',
    color: '#FF375F'
  })

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', principal: '', balance: '', interestRate: '', minimumPayment: '', strategy: 'avalanche', color: '#FF375F' })
    setShowForm(true)
  }

  const openEdit = (debt) => {
    setEditing(debt)
    setForm({
      name: debt.name,
      principal: String(debt.principal),
      balance: String(debt.balance),
      interestRate: String(debt.interestRate),
      minimumPayment: String(debt.minimumPayment),
      strategy: debt.strategy,
      color: debt.color
    })
    setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      name: form.name,
      principal: Number(form.principal) || 0,
      balance: Number(form.balance) || 0,
      interestRate: Number(form.interestRate) || 0,
      minimumPayment: Number(form.minimumPayment) || 0,
      strategy: form.strategy,
      color: form.color
    }
    if (editing) updateDebt(editing.id, data)
    else addDebt(data)
    setShowForm(false)
  }

  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0)
  const totalMinPayment = debts.reduce((sum, d) => sum + d.minimumPayment, 0)
  const extra = Number(extraPayment) || 0
  const totalMonthly = totalMinPayment + extra

  const orderedDebts = useMemo(() => {
    const strategy = selectedStrategy
    return [...debts].sort((a, b) => {
      if (strategy === 'avalanche') return b.interestRate - a.interestRate
      if (strategy === 'snowball') return a.balance - b.balance
      return 0
    })
  }, [debts, selectedStrategy])

  const baselineProjection = useMemo(() => {
    return calculatePayoff(debts.map((d) => ({ ...d, currentBalance: d.balance })), totalMinPayment, 'avalanche')
  }, [debts, totalMinPayment])

  const payoffProjection = useMemo(() => {
    return calculatePayoff(debts.map((d) => ({ ...d, currentBalance: d.balance })), totalMonthly, selectedStrategy)
  }, [debts, totalMonthly, selectedStrategy])

  const interestSaved = useMemo(() => {
    if (!baselineProjection.interestPaid || !payoffProjection.interestPaid) return 0
    return Math.max(0, baselineProjection.interestPaid - payoffProjection.interestPaid)
  }, [baselineProjection, payoffProjection])

  return (
    <div className="animate-fade-in px-4 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-on-surface-variant">Payoff plan</p>
          <h1 className="text-2xl font-bold text-on-surface">Debts</h1>
        </div>
      </header>

      <section className="mb-5 rounded-3xl bg-surface p-5 border border-outline-variant">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-on-surface-variant">Total Debt</p>
            <p className="mt-1 text-3xl font-bold text-on-surface">{formatLKR(totalDebt)}</p>
          </div>
          <div className="rounded-full bg-error/20 p-3">
            <TrendingDown size={24} className="text-error" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-surface-variant p-3">
            <p className="text-[10px] text-on-surface-variant">Min. Payments</p>
            <p className="text-sm font-semibold text-on-surface">{formatLKR(totalMinPayment)}/mo</p>
          </div>
          <div className="rounded-2xl bg-surface-variant p-3">
            <p className="text-[10px] text-on-surface-variant">Payoff Date</p>
            <p className="text-sm font-semibold text-on-surface">
              {payoffProjection.months < 120
                ? new Date(Date.now() + payoffProjection.months * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                : '10+ years'}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-5 rounded-2xl bg-surface p-4 border border-outline-variant">
        <div className="mb-3 flex items-center gap-2">
          <Calculator size={18} className="text-primary" />
          <h2 className="text-base font-semibold text-on-surface">Payoff Calculator</h2>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-on-surface-variant">Extra Monthly Payment</label>
          <input
            type="number"
            value={extraPayment}
            onChange={(e) => setExtraPayment(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
          />
        </div>

        <div className="mb-3">
          <label className="mb-2 block text-xs font-medium text-on-surface-variant">Strategy</label>
          <div className="grid grid-cols-3 gap-2">
            {STRATEGIES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStrategy(s.id)}
                className={`rounded-xl border px-2 py-2 text-center text-xs font-medium ${
                  selectedStrategy === s.id
                    ? 'border-primary bg-primary-container text-primary'
                    : 'border-outline-variant bg-surface text-on-surface-variant'
                }`}
              >
                <div>{s.name}</div>
                <div className="mt-0.5 text-[9px] opacity-80">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-primary-container p-3">
          <p className="text-xs text-on-primary-container">
            With {formatLKR(extra)} extra/month using {selectedStrategy} strategy:
          </p>
          <p className="mt-1 text-lg font-bold text-on-primary-container">
            Debt-free in {payoffProjection.months < 120 ? `${payoffProjection.months} months` : '10+ years'}
          </p>
          {interestSaved > 0 && (
            <p className="mt-1 text-xs text-green-400">
              Save {formatLKR(interestSaved)} in interest vs. minimum payments
            </p>
          )}
        </div>
      </section>

      <section className="mb-24 space-y-3">
        <h2 className="mb-3 text-lg font-semibold text-on-surface">Your Debts</h2>
        {orderedDebts.map((debt, index) => {
          const percent = debt.principal > 0 ? Math.min((debt.balance / debt.principal) * 100, 100) : 0
          return (
            <button
              key={debt.id}
              onClick={() => openEdit(debt)}
              className="w-full rounded-2xl bg-surface p-4 text-left border border-outline-variant"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-bright text-sm font-bold text-on-surface">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-on-surface">{debt.name}</p>
                    <p className="text-xs text-on-surface-variant">{debt.interestRate}% interest · Min {formatLKR(debt.minimumPayment)}/mo</p>
                  </div>
                </div>
                <p className="text-sm font-semibold" style={{ color: debt.color }}>{formatLKR(debt.balance)}</p>
              </div>

              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-on-surface-variant">Paid {Math.round(100 - percent)}%</span>
                <span className="text-xs text-on-surface-variant">{formatLKR(debt.principal)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${100 - percent}%`, backgroundColor: debt.color }}
                />
              </div>
            </button>
          )
        })}
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
              <h2 className="text-xl font-bold text-on-surface">{editing ? 'Edit Debt' : 'New Debt'}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full p-2 text-on-surface-variant">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Debt name"
                className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  type="number"
                  step="0.01"
                  value={form.principal}
                  onChange={(e) => setForm({ ...form, principal: e.target.value })}
                  placeholder="Original amount"
                  className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
                />
                <input
                  required
                  type="number"
                  step="0.01"
                  value={form.balance}
                  onChange={(e) => setForm({ ...form, balance: e.target.value })}
                  placeholder="Current balance"
                  className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  type="number"
                  step="0.01"
                  value={form.interestRate}
                  onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                  placeholder="Interest rate %"
                  className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
                />
                <input
                  required
                  type="number"
                  step="0.01"
                  value={form.minimumPayment}
                  onChange={(e) => setForm({ ...form, minimumPayment: e.target.value })}
                  placeholder="Min payment"
                  className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
                />
              </div>
              <select
                value={form.strategy}
                onChange={(e) => setForm({ ...form, strategy: e.target.value })}
                className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
              >
                {STRATEGIES.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.desc}</option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                {['#FF375F', '#FF9500', '#FFCC00', '#BF5AF2', '#0A84FF', '#30D158'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`h-8 w-8 rounded-full border-2 ${form.color === c ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              {editing && (
                <button
                  type="button"
                  onClick={() => { deleteDebt(editing.id); setShowForm(false) }}
                  className="flex items-center gap-2 rounded-2xl bg-error/20 px-5 py-3 text-sm font-semibold text-error"
                >
                  <Trash2 size={16} /> Delete
                </button>
              )}
              <button type="submit" className="flex-1 rounded-2xl bg-primary py-3 text-sm font-semibold text-on-primary">
                {editing ? 'Save Changes' : 'Add Debt'}
              </button>
            </div>
          </form>
        </div>
        </>
      )}
    </div>
  )
}
