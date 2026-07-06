import { useState } from 'react'
import { Plus, Wallet2, Building2, Banknote, CreditCard, Landmark, X, CheckCircle2, Scale } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatLKR, generateId } from '../lib/utils'
import * as LucideIcons from 'lucide-react'

import ModalRoot from './ModalRoot'

const ACCOUNT_TYPES = [
  { id: 'bank', label: 'Bank', icon: Building2 },
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'wallet', label: 'Wallet', icon: Wallet2 },
  { id: 'credit', label: 'Credit Card', icon: CreditCard },
  { id: 'investment', label: 'Investment', icon: Landmark }
]

const ACCOUNT_ICONS = ['Building2', 'Banknote', 'Wallet2', 'CreditCard', 'Landmark', 'PiggyBank', 'Coins']

export default function Accounts() {
  const { accounts, addAccount, updateAccount, deleteAccount, reconcileAccount } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [reconciling, setReconciling] = useState(null)
  const [statementBalance, setStatementBalance] = useState('')

  const [form, setForm] = useState({
    name: '',
    type: 'bank',
    balance: '',
    currency: 'LKR',
    color: '#0A84FF',
    icon: 'Building2'
  })

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', type: 'bank', balance: '', currency: 'LKR', color: '#0A84FF', icon: 'Building2' })
    setShowForm(true)
  }

  const openEdit = (account) => {
    setEditing(account)
    setForm({
      name: account.name,
      type: account.type,
      balance: String(account.balance),
      currency: account.currency,
      color: account.color,
      icon: account.icon
    })
    setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      ...form,
      initialBalance: Number(form.balance) || 0,
      balance: Number(form.balance) || 0
    }
    if (editing) {
      const old = accounts.find((a) => a.id === editing.id)
      const oldInitial = old?.initialBalance || 0
      const newInitial = data.initialBalance
      // preserve transaction-calculated delta when editing initial balance
      data.balance = (old?.balance || 0) - oldInitial + newInitial
      updateAccount(editing.id, data)
    } else {
      addAccount(data)
    }
    setShowForm(false)
  }

  const handleDelete = () => {
    if (editing && confirm('Delete this account and all its transactions?')) {
      deleteAccount(editing.id)
      setShowForm(false)
    }
  }

  const total = accounts.reduce((sum, a) => sum + a.balance, 0)
  const todayStr = new Date().toISOString().slice(0, 10)

  const openReconcile = (account) => {
    setReconciling(account)
    setStatementBalance(String(account.balance))
  }

  const handleReconcile = (e) => {
    e.preventDefault()
    if (!reconciling) return
    reconcileAccount(reconciling.id, Number(statementBalance) || 0)
    setReconciling(null)
    setStatementBalance('')
  }

  return (
    <div className="animate-fade-in px-4 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-on-surface-variant">Your money</p>
          <h1 className="text-2xl font-bold text-on-surface">Accounts</h1>
        </div>
        <button
          onClick={openNew}
          aria-label="Add account"
          className="rounded-full bg-primary p-3 text-on-primary shadow-lg shadow-primary/20"
        >
          <Plus size={22} />
        </button>
      </header>

      <section className="mb-6 rounded-3xl bg-surface p-6 border border-outline-variant">
        <p className="text-sm font-medium text-on-surface-variant">Total Balance</p>
        <p className="mt-1 text-4xl font-bold text-on-surface">{formatLKR(total)}</p>
      </section>

      <section className="space-y-3">
        {accounts.map((account) => {
          const Icon = LucideIcons[account.icon] || Building2
          const typeLabel = ACCOUNT_TYPES.find((t) => t.id === account.type)?.label || account.type
          const isReconciled =
            account.reconciledBalance !== undefined &&
            Math.abs((account.reconciledBalance || 0) - account.balance) < 0.01
          const reconciledToday = account.lastReconciledAt && new Date(account.lastReconciledAt).toISOString().slice(0, 10) === todayStr
          return (
            <div
              key={account.id}
              className="flex w-full items-center justify-between rounded-2xl bg-surface p-4 border border-outline-variant"
            >
              <button
                onClick={() => openEdit(account)}
                className="flex flex-1 items-center gap-3 text-left min-w-0 active:bg-surface-bright"
              >
                <div
                  className="rounded-xl p-2.5"
                  style={{ backgroundColor: `${account.color}22` }}
                >
                  <Icon size={22} style={{ color: account.color }} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-on-surface">{account.name}</p>
                  <p className="text-xs text-on-surface-variant">{typeLabel}</p>
                  <div className="mt-1 flex items-center gap-1">
                    {isReconciled ? (
                      <>
                        <CheckCircle2 size={12} className="text-green-400" />
                        <span className="text-[10px] text-green-400">{reconciledToday ? 'Reconciled today' : 'Reconciled'}</span>
                      </>
                    ) : (
                      <>
                        <Scale size={12} className="text-on-surface-variant" />
                        <span className="text-[10px] text-on-surface-variant">Unreconciled</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
              <div className="flex-shrink-0 text-right ml-3">
                <p className="text-base font-semibold text-on-surface">{formatLKR(account.balance)}</p>
                <button
                  type="button"
                  aria-label={`Reconcile ${account.name}`}
                  onClick={(e) => { e.stopPropagation(); openReconcile(account) }}
                  className="mt-1 text-xs text-primary"
                >
                  Reconcile
                </button>
              </div>
            </div>
          )
        })}
      </section>

      {showForm && (
        <ModalRoot>
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md animate-slide-up rounded-t-3xl bg-surface p-6 pb-24 border-t border-outline-variant"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface">
                {editing ? 'Edit Account' : 'New Account'}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-full p-2 text-on-surface-variant hover:bg-surface-bright"
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
                  className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-on-surface focus:border-primary"
                  placeholder="e.g. Commercial Bank"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-on-surface"
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Balance</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={form.balance}
                    onChange={(e) => setForm({ ...form, balance: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-on-surface"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-on-surface-variant">Color</label>
                <div className="flex flex-wrap gap-2">
                  {['#0A84FF', '#30D158', '#FF9500', '#FF375F', '#BF5AF2', '#FFCC00', '#64D2FF', '#5E5CE6'].map(
                    (c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, color: c })}
                        className={`h-8 w-8 rounded-full border-2 ${
                          form.color === c ? 'border-white' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              {editing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-2xl bg-error/20 px-5 py-3 text-sm font-semibold text-error"
                >
                  Delete
                </button>
              )}
              <button
                type="submit"
                className="flex-1 rounded-2xl bg-primary py-3 text-sm font-semibold text-on-primary"
              >
                {editing ? 'Save Changes' : 'Create Account'}
              </button>
            </div>
          </form>
          </div>
        </ModalRoot>
      )}
      {reconciling && (
        <ModalRoot>
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 backdrop-blur-sm">
            <form
              onSubmit={handleReconcile}
              className="w-full max-w-md animate-slide-up rounded-t-3xl bg-surface p-6 pb-24 border-t border-outline-variant"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-on-surface">Reconcile {reconciling.name}</h2>
                <button
                  type="button"
                  onClick={() => { setReconciling(null); setStatementBalance('') }}
                  className="rounded-full p-2 text-on-surface-variant hover:bg-surface-bright"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl bg-black p-4">
                  <p className="text-xs text-on-surface-variant">App balance</p>
                  <p className="text-lg font-semibold text-on-surface">{formatLKR(reconciling.balance)}</p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Statement balance</label>
                  <input
                    autoFocus
                    required
                    type="number"
                    step="0.01"
                    value={statementBalance}
                    onChange={(e) => setStatementBalance(e.target.value)}
                    className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-on-surface"
                    placeholder="0.00"
                  />
                </div>

                {statementBalance !== '' && (
                  <div className={`rounded-2xl p-4 ${Math.abs(Number(statementBalance) - reconciling.balance) < 0.01 ? 'bg-green-400/10' : 'bg-error/10'}`}>
                    <p className="text-xs text-on-surface-variant">Difference</p>
                    <p className={`text-lg font-semibold ${Math.abs(Number(statementBalance) - reconciling.balance) < 0.01 ? 'text-green-400' : 'text-error'}`}>
                      {formatLKR(Number(statementBalance) - reconciling.balance)}
                    </p>
                    {Math.abs(Number(statementBalance) - reconciling.balance) < 0.01 ? (
                      <p className="mt-1 text-xs text-green-400">Balances match.</p>
                    ) : (
                      <p className="mt-1 text-xs text-error">Review missing or duplicate transactions.</p>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="mt-6 w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-on-primary"
              >
                Mark Reconciled
              </button>
            </form>
          </div>
        </ModalRoot>
      )}
    </div>
  )
}
