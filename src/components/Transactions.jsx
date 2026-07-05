import { useState, useMemo } from 'react'
import { Plus, Search, SlidersHorizontal, X, Trash2, Tags, CheckSquare, Square, Check } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import TransactionItem from './TransactionItem'
import AddTransaction from './AddTransaction'
import TagInput from './TagInput'

const FILTERS = ['all', 'income', 'expense', 'transfer']

export default function Transactions() {
  const { transactions, categories, accounts, bulkDeleteTransactions, bulkUpdateTransactions } = useAppStore()
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState([])
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkCategory, setBulkCategory] = useState('')
  const [bulkTags, setBulkTags] = useState([])

  const activeFilterCount = [
    filter !== 'all',
    dateFrom,
    dateTo,
    accountFilter,
    categoryFilter,
    minAmount,
    maxAmount
  ].filter(Boolean).length

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        !search ||
        t.note?.toLowerCase().includes(search.toLowerCase()) ||
        t.amount.toString().includes(search) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
      const matchesFilter = filter === 'all' || t.type === filter
      const matchesDate =
        (!dateFrom || t.date >= dateFrom) &&
        (!dateTo || t.date <= dateTo)
      const matchesAccount =
        !accountFilter ||
        t.accountId === accountFilter ||
        t.transferTo === accountFilter
      const matchesCategory = !categoryFilter || t.categoryId === categoryFilter
      const matchesAmount =
        (!minAmount || t.amount >= Number(minAmount)) &&
        (!maxAmount || t.amount <= Number(maxAmount))
      return matchesSearch && matchesFilter && matchesDate && matchesAccount && matchesCategory && matchesAmount
    })
  }, [transactions, search, filter, dateFrom, dateTo, accountFilter, categoryFilter, minAmount, maxAmount])

  const handleEdit = (transaction) => {
    setEditing({ ...transaction })
    setShowAdd(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this transaction?')) {
      await useAppStore.getState().deleteTransaction(id)
    }
  }

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    setSelected(selected.length === filtered.length ? [] : filtered.map((t) => t.id))
  }

  const clearFilters = () => {
    setFilter('all')
    setDateFrom('')
    setDateTo('')
    setAccountFilter('')
    setCategoryFilter('')
    setMinAmount('')
    setMaxAmount('')
  }

  const applyBulk = () => {
    const patch = {}
    if (bulkCategory) patch.categoryId = bulkCategory
    if (bulkTags.length > 0) patch.tags = bulkTags
    if (Object.keys(patch).length > 0) {
      bulkUpdateTransactions(selected, patch)
    }
    setSelected([])
    setBulkMode(false)
  }

  const deleteBulk = async () => {
    if (confirm(`Delete ${selected.length} transactions?`)) {
      await bulkDeleteTransactions(selected)
      setSelected([])
      setBulkMode(false)
    }
  }

  return (
    <div className="animate-fade-in px-4 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-on-surface-variant">History</p>
          <h1 className="text-2xl font-bold text-on-surface">Transactions</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setBulkMode(!bulkMode)
              setSelected([])
            }}
            className={`rounded-full p-3 ${bulkMode ? 'bg-primary text-on-primary' : 'bg-surface text-on-surface-variant border border-outline-variant'}`}
          >
            <CheckSquare size={20} />
          </button>
          <button
            onClick={() => {
              setEditing(null)
              setShowAdd(true)
            }}
            className="rounded-full bg-primary p-3 text-on-primary shadow-lg shadow-primary/20"
          >
            <Plus size={22} />
          </button>
        </div>
      </header>

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search note, amount, tags"
            className="w-full rounded-2xl border border-outline-variant bg-surface py-2.5 pl-10 pr-4 text-sm text-on-surface"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilters(true)}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm ${
              activeFilterCount > 0
                ? 'border-primary bg-primary-container text-primary'
                : 'border-outline-variant bg-surface text-on-surface'
            }`}
          >
            <SlidersHorizontal size={16} />
            {activeFilterCount > 0 && <span className="text-xs">{activeFilterCount}</span>}
          </button>
        </div>
      </div>

      {bulkMode && (
        <div className="mb-4 rounded-2xl bg-surface p-3 border border-outline-variant">
          <div className="mb-3 flex items-center justify-between">
            <button onClick={selectAll} className="flex items-center gap-2 text-sm text-primary">
              {selected.length === filtered.length ? <CheckSquare size={16} /> : <Square size={16} />}
              {selected.length} selected
            </button>
            <button onClick={() => { setBulkMode(false); setSelected([]) }} className="text-xs text-on-surface-variant">Done</button>
          </div>
          {selected.length > 0 && (
            <div className="space-y-2">
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="w-full rounded-xl border border-outline-variant bg-black px-3 py-2 text-sm text-on-surface"
              >
                <option value="">Set category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <TagInput tags={bulkTags} onChange={setBulkTags} placeholder="Set tags..." />
              <div className="flex gap-2">
                <button onClick={applyBulk} className="flex-1 rounded-xl bg-primary py-2 text-xs font-semibold text-on-primary">Apply</button>
                <button onClick={deleteBulk} className="flex-1 rounded-xl bg-error/20 py-2 text-xs font-semibold text-error">Delete</button>
              </div>
            </div>
          )}
        </div>
      )}

      <section className="space-y-2 pb-24">
        {filtered.length > 0 ? (
          filtered.map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              {bulkMode && (
                <button
                  onClick={() => toggleSelect(t.id)}
                  className="text-primary"
                >
                  {selected.includes(t.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                </button>
              )}
              <div className="flex-1">
                <TransactionItem transaction={t} onClick={() => !bulkMode && handleEdit(t)} onDelete={() => handleDelete(t.id)} />
              </div>
            </div>
          ))
        ) : (
          <div className="py-16 text-center">
            <p className="text-sm text-on-surface-variant">No transactions found.</p>
            <button onClick={() => setShowAdd(true)} className="mt-3 text-sm text-primary">Add your first transaction</button>
          </div>
        )}
      </section>

      {showAdd && (
        <AddTransaction
          editing={editing}
          onClose={() => {
            setShowAdd(false)
            setEditing(null)
          }}
        />
      )}

      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-surface p-6 border-t border-outline-variant">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface">Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="rounded-full p-2 text-on-surface-variant"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-on-surface-variant">Type</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-sm text-on-surface"
                >
                  {FILTERS.map((f) => (
                    <option key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-xl border border-outline-variant bg-black px-3 py-3 text-sm text-on-surface"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-xl border border-outline-variant bg-black px-3 py-3 text-sm text-on-surface"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-on-surface-variant">Account</label>
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-sm text-on-surface"
                >
                  <option value="">All accounts</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-on-surface-variant">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-sm text-on-surface"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Min amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-outline-variant bg-black px-3 py-3 text-sm text-on-surface"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Max amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    placeholder="∞"
                    className="w-full rounded-xl border border-outline-variant bg-black px-3 py-3 text-sm text-on-surface"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={clearFilters}
                className="flex-1 rounded-2xl border border-outline-variant py-3 text-sm font-semibold text-on-surface"
              >
                Clear
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="flex-1 rounded-2xl bg-primary py-3 text-sm font-semibold text-on-primary"
              >
                Show {filtered.length} results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
