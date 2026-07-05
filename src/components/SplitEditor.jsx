import { X, Plus } from 'lucide-react'
import * as LucideIcons from 'lucide-react'

export default function SplitEditor({ total, splits, categories, onChange }) {
  const expenseCategories = categories.filter((c) => c.type === 'expense')

  const addSplit = () => {
    const used = splits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
    const remaining = Math.max(total - used, 0)
    onChange([
      ...splits,
      {
        id: `${Date.now()}`,
        categoryId: expenseCategories[0]?.id || '',
        amount: remaining,
        note: ''
      }
    ])
  }

  const updateSplit = (id, patch) => {
    onChange(splits.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  const removeSplit = (id) => {
    onChange(splits.filter((s) => s.id !== id))
  }

  const used = splits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
  const remaining = total - used

  return (
    <div className="rounded-2xl border border-outline-variant bg-black p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-on-surface-variant">Total: LKR {total.toFixed(2)}</span>
        <span className={`text-xs font-medium ${remaining === 0 ? 'text-primary' : 'text-error'}`}>
          {remaining === 0 ? 'Balanced' : `Remaining: LKR ${remaining.toFixed(2)}`}
        </span>
      </div>

      <div className="space-y-2">
        {splits.map((split) => {
          const category = categories.find((c) => c.id === split.categoryId)
          const Icon = category?.icon ? LucideIcons[category.icon] : LucideIcons.CircleDollarSign
          return (
            <div key={split.id} className="flex items-center gap-2">
              <select
                value={split.categoryId}
                onChange={(e) => updateSplit(split.id, { categoryId: e.target.value })}
                className="flex-1 rounded-xl border border-outline-variant bg-surface px-2 py-2 text-xs text-on-surface"
              >
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                value={split.amount}
                onChange={(e) => updateSplit(split.id, { amount: Number(e.target.value) })}
                className="w-24 rounded-xl border border-outline-variant bg-surface px-2 py-2 text-right text-xs text-on-surface"
              />
              <button
                type="button"
                onClick={() => removeSplit(split.id)}
                className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={addSplit}
        disabled={used >= total}
        className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-outline-variant py-2 text-xs font-medium text-on-surface-variant disabled:opacity-40"
      >
        <Plus size={14} /> Add Split
      </button>
    </div>
  )
}
