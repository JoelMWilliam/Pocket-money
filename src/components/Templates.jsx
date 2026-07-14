import { useState } from 'react'
import { X, Trash2, LayoutTemplate } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatLKR } from '../lib/utils'
import { getIcon } from '../lib/icons'
import ModalRoot from './ModalRoot'

const TYPES = [
  { id: 'expense', name: 'Expense' },
  { id: 'income', name: 'Income' },
  { id: 'transfer', name: 'Transfer' }
]

import { useRegisterQuickAdd } from '../contexts/QuickAddContext'

export default function Templates({ setScreen }) {
  useRegisterQuickAdd(() => openNew())
  const { accounts, categories, templates, addTemplate, updateTemplate, deleteTemplate } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const [form, setForm] = useState({
    name: '',
    type: 'expense',
    amount: '',
    accountId: accounts[0]?.id || '',
    categoryId: '',
    note: ''
  })

  const openNew = () => {
    setEditing(null)
    setForm({
      name: '',
      type: 'expense',
      amount: '',
      accountId: accounts[0]?.id || '',
      categoryId: categories.find((c) => c.type === 'expense')?.id || '',
      note: ''
    })
    setShowForm(true)
  }

  const openEdit = (template) => {
    setEditing(template)
    setForm({
      name: template.name,
      type: template.type,
      amount: String(template.amount),
      accountId: template.accountId,
      categoryId: template.categoryId,
      note: template.note || ''
    })
    setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      name: form.name,
      type: form.type,
      amount: Number(form.amount) || 0,
      accountId: form.accountId,
      categoryId: form.categoryId,
      note: form.note
    }
    if (editing) updateTemplate(editing.id, data)
    else addTemplate(data)
    setShowForm(false)
  }

  const handleUse = (template) => {
    useAppStore.getState().addTransaction({
      type: template.type,
      amount: template.amount,
      accountId: template.accountId,
      categoryId: template.categoryId,
      note: template.note,
      date: new Date().toISOString().slice(0, 10)
    })
    alert(`Created ${template.name}`)
  }

  return (
    <div className="animate-fade-in px-4 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-on-surface-variant">Quick create</p>
          <h1 className="text-2xl font-bold text-on-surface">Templates</h1>
        </div>
      </header>

      <section className="mb-24 space-y-3">
        {templates.map((template) => {
          const category = categories.find((c) => c.id === template.categoryId)
          const account = accounts.find((a) => a.id === template.accountId)
          const Icon = category?.icon ? getIcon(category.icon) : getIcon('CircleDollarSign')
          return (
            <div
              key={template.id}
              className="rounded-2xl bg-surface p-4 border border-outline-variant"
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
                    <p className="text-sm font-medium text-on-surface">{template.name}</p>
                    <p className="text-xs text-on-surface-variant">{account?.name} · {category?.name}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-on-surface">{formatLKR(template.amount)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUse(template)}
                  className="flex-1 rounded-xl bg-primary py-2 text-xs font-semibold text-on-primary"
                >
                  Use Now
                </button>
                <button
                  onClick={() => openEdit(template)}
                  className="rounded-xl border border-outline-variant bg-surface px-4 py-2 text-xs font-medium text-on-surface"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteTemplate(template.id)}
                  className="rounded-xl bg-error/20 px-3 py-2 text-error"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </section>

      {templates.length === 0 && (
        <div className="py-16 text-center">
          <LayoutTemplate size={40} className="mx-auto mb-3 text-on-surface-variant" />
          <p className="text-sm text-on-surface-variant">No templates yet.</p>
          <button onClick={openNew} className="mt-3 text-sm text-primary">Create a template</button>
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
              <h2 className="text-xl font-bold text-on-surface">{editing ? 'Edit Template' : 'New Template'}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full p-2 text-on-surface-variant">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Template name"
                className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
                >
                  {TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="Amount"
                  className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.accountId}
                  onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
                >
                  {categories
                    .filter((c) => c.type === form.type)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>
              <input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Note"
                className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
              />
            </div>

            <button type="submit" className="mt-6 w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-on-primary">
              {editing ? 'Save Changes' : 'Create Template'}
            </button>
          </form>
        </div>
        </ModalRoot>
      )}
    </div>
  )
}
