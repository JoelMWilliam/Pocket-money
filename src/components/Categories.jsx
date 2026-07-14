import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useRegisterQuickAdd } from '../contexts/QuickAddContext'
import { getIcon, ICON_NAMES } from '../lib/icons'
import { PRESET_COLORS } from '../lib/theme'
import { RegisterModal } from './ModalRoot'

const TYPES = [
  { id: 'expense', label: 'Expense' },
  { id: 'income', label: 'Income' },
  { id: 'transfer', label: 'Transfer' }
]

export default function Categories() {
  useRegisterQuickAdd(() => openNew())
  const { categories, addCategory, updateCategory, deleteCategory } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', type: 'expense', icon: ICON_NAMES[0], color: PRESET_COLORS[0].value })

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', type: 'expense', icon: ICON_NAMES[0], color: PRESET_COLORS[0].value })
    setShowForm(true)
  }

  const openEdit = (category) => {
    setEditing(category)
    setForm({ name: category.name, type: category.type, icon: category.icon, color: category.color })
    setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = { name: form.name, type: form.type, icon: form.icon, color: form.color }
    if (editing) updateCategory(editing.id, data)
    else addCategory(data)
    setShowForm(false)
  }

  const handleDelete = (category) => {
    if (confirm(`Delete "${category.name}"? This will also remove all transactions using this category.`)) {
      deleteCategory(category.id)
    }
  }

  return (
    <div className="animate-fade-in px-4 pt-6">
      <header className="mb-6">
        <p className="text-sm text-on-surface-variant">Transaction tags</p>
        <h1 className="text-2xl font-bold text-on-surface">Categories</h1>
      </header>

      <section className="space-y-6">
        {TYPES.map((type) => {
          const items = categories.filter((c) => c.type === type.id)
          return (
            <div key={type.id}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-on-surface-variant">{type.label}</h2>
              <div className="grid grid-cols-2 gap-3">
                {items.map((c) => {
                  const Icon = getIcon(c.icon)
                  return (
                    <button
                      key={c.id}
                      onClick={() => openEdit(c)}
                      className="flex items-center gap-3 rounded-2xl bg-surface p-3 text-left border border-outline-variant"
                    >
                      <div className="rounded-xl p-2" style={{ backgroundColor: `${c.color}22` }}>
                        <Icon size={20} style={{ color: c.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-on-surface">{c.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(c) }}
                        className="rounded-full p-1.5 text-on-surface-variant hover:text-error"
                        aria-label={`Delete ${c.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </button>
                  )
                })}
                {items.length === 0 && <p className="col-span-2 text-sm text-on-surface-variant">No {type.label.toLowerCase()} categories.</p>}
              </div>
            </div>
          )
        })}
      </section>

      {showForm && (
        <>
          <RegisterModal />
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
            <form
              onSubmit={handleSubmit}
              className="w-full max-w-md animate-slide-up rounded-t-3xl bg-surface p-6 pb-24 border-t border-outline-variant"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-on-surface">{editing ? 'Edit Category' : 'New Category'}</h2>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-full p-2 text-on-surface-variant">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Category name"
                  className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
                />

                <div className="flex rounded-xl border border-outline-variant bg-surface p-1">
                  {TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setForm({ ...form, type: t.id })}
                      className={`flex-1 rounded-lg py-2 text-sm ${form.type === t.id ? 'bg-primary text-on-primary' : 'text-on-surface'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-on-surface-variant">Icon</p>
                  <div className="grid grid-cols-7 gap-2">
                    {ICON_NAMES.map((name) => {
                      const Icon = getIcon(name)
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setForm({ ...form, icon: name })}
                          className={`flex h-10 items-center justify-center rounded-xl ${form.icon === name ? 'bg-primary-container text-primary' : 'bg-surface text-on-surface-variant border border-outline-variant'}`}
                          aria-label={name}
                        >
                          <Icon size={18} />
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-on-surface-variant">Color</p>
                  <div className="flex flex-wrap gap-3">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setForm({ ...form, color: c.value })}
                        className={`h-8 w-8 rounded-full ${form.color === c.value ? 'ring-2 ring-on-surface' : ''}`}
                        style={{ backgroundColor: c.value }}
                        aria-label={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                {editing && (
                  <button
                    type="button"
                    onClick={() => { deleteCategory(editing.id); setShowForm(false) }}
                    className="flex items-center gap-2 rounded-2xl bg-error/20 px-5 py-3 text-sm font-semibold text-error"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                )}
                <button type="submit" className="flex-1 rounded-2xl bg-primary py-3 text-sm font-semibold text-on-primary">
                  {editing ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
