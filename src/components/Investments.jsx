import { useState } from 'react'
import { Plus, X, Trash2, TrendingUp } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatLKR } from '../lib/utils'
import ModalRoot from './ModalRoot'

const TYPES = [
  { id: 'stock', name: 'Stock / ETF' },
  { id: 'epf', name: 'EPF / Pension' },
  { id: 'fixed', name: 'Fixed Deposit' },
  { id: 'crypto', name: 'Crypto' },
  { id: 'other', name: 'Other' }
]

export default function Investments() {
  const { investments, accounts, addInvestment, updateInvestment, deleteInvestment } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    name: '',
    type: 'stock',
    symbol: '',
    units: '',
    purchasePrice: '',
    currentPrice: '',
    currency: 'LKR'
  })

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', type: 'stock', symbol: '', units: '', purchasePrice: '', currentPrice: '', currency: 'LKR' })
    setShowForm(true)
  }

  const openEdit = (inv) => {
    setEditing(inv)
    setForm({
      name: inv.name,
      type: inv.type,
      symbol: inv.symbol || '',
      units: String(inv.units || ''),
      purchasePrice: String(inv.purchasePrice || ''),
      currentPrice: String(inv.currentPrice || ''),
      currency: inv.currency || 'LKR'
    })
    setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      name: form.name,
      type: form.type,
      symbol: form.symbol,
      units: Number(form.units) || 1,
      purchasePrice: Number(form.purchasePrice) || 0,
      currentPrice: Number(form.currentPrice) || 0,
      currency: form.currency
    }
    if (editing) {
      updateInvestment(editing.id, data)
    } else {
      addInvestment(data)
    }
    setShowForm(false)
  }

  const totalValue = investments.reduce((sum, i) => sum + (i.currentPrice || 0) * (i.units || 1), 0)
  const totalCost = investments.reduce((sum, i) => sum + (i.purchasePrice || 0) * (i.units || 1), 0)
  const totalGain = totalValue - totalCost

  return (
    <div className="animate-fade-in px-4 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-on-surface-variant">Assets & investments</p>
          <h1 className="text-2xl font-bold text-on-surface">Investments</h1>
        </div>
        <button
          onClick={openNew}
          className="rounded-full bg-primary p-3 text-on-primary shadow-lg shadow-primary/20"
        >
          <Plus size={22} />
        </button>
      </header>

      <section className="mb-6 rounded-2xl bg-surface p-4 border border-outline-variant">
        <div className="mb-3 flex items-center gap-3">
          <div className="rounded-full bg-primary-container p-2 text-primary">
            <TrendingUp size={18} />
          </div>
          <div>
            <p className="text-xs text-on-surface-variant">Total Portfolio Value</p>
            <p className="text-xl font-bold text-on-surface">{formatLKR(totalValue)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-black p-3">
            <p className="text-xs text-on-surface-variant">Total Cost</p>
            <p className="text-sm font-semibold text-on-surface">{formatLKR(totalCost)}</p>
          </div>
          <div className="rounded-xl bg-black p-3">
            <p className="text-xs text-on-surface-variant">Unrealized P/L</p>
            <p className={`text-sm font-semibold ${totalGain >= 0 ? 'text-green-400' : 'text-error'}`}>
              {totalGain >= 0 ? '+' : ''}{formatLKR(totalGain)}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {investments.map((inv) => {
          const value = (inv.currentPrice || 0) * (inv.units || 1)
          const cost = (inv.purchasePrice || 0) * (inv.units || 1)
          const gain = value - cost
          return (
            <button
              key={inv.id}
              onClick={() => openEdit(inv)}
              className="w-full rounded-2xl bg-surface p-4 text-left border border-outline-variant"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface">{inv.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {TYPES.find((t) => t.id === inv.type)?.name}
                    {inv.symbol ? ` · ${inv.symbol}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-on-surface">{formatLKR(value)}</p>
                  <p className={`text-xs ${gain >= 0 ? 'text-green-400' : 'text-error'}`}>
                    {gain >= 0 ? '+' : ''}{formatLKR(gain)}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-on-surface-variant">
                <span>{inv.units || 1} unit{(inv.units || 1) > 1 ? 's' : ''}</span>
                <span>@{formatLKR(inv.currentPrice || 0)}</span>
              </div>
            </button>
          )
        })}
      </section>

      {investments.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm text-on-surface-variant">No investments yet.</p>
          <button onClick={openNew} className="mt-3 text-sm text-primary">Add EPF, stocks or deposits</button>
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
              <h2 className="text-xl font-bold text-on-surface">{editing ? 'Edit Investment' : 'New Investment'}</h2>
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
                <label className="mb-1 block text-xs font-medium text-on-surface-variant">Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. EPF Balance"
                  className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-sm text-on-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-sm text-on-surface"
                  >
                    {TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Symbol (optional)</label>
                  <input
                    value={form.symbol}
                    onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                    placeholder="COMB.N0000"
                    className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-sm text-on-surface"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Units / Quantity</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.units}
                    onChange={(e) => setForm({ ...form, units: e.target.value })}
                    placeholder="1"
                    className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-sm text-on-surface"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Currency</label>
                  <input
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    placeholder="LKR"
                    className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-sm text-on-surface"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Purchase Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.purchasePrice}
                    onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-sm text-on-surface"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Current Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.currentPrice}
                    onChange={(e) => setForm({ ...form, currentPrice: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-sm text-on-surface"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    deleteInvestment(editing.id)
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
                {editing ? 'Save Changes' : 'Add Investment'}
              </button>
            </div>
          </form>
        </div>
        </ModalRoot>
      )}
    </div>
  )
}
