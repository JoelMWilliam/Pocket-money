import { useState } from 'react'
import { X, Trash2, ShieldCheck } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import ModalRoot from './ModalRoot'

const FIELDS = [
  { id: 'note', name: 'Note' },
  { id: 'merchant', name: 'Merchant' },
  { id: 'amount', name: 'Amount' },
  { id: 'any', name: 'Any field' }
]

import { useRegisterQuickAdd } from '../contexts/QuickAddContext'

export default function Rules() {
  useRegisterQuickAdd(() => openNew())
  const { accounts, categories, rules, addRule, updateRule, deleteRule } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const [form, setForm] = useState({
    name: '',
    field: 'note',
    pattern: '',
    actionCategoryId: '',
    actionAccountId: '',
    actionTags: '',
    active: true
  })

  const openNew = () => {
    setEditing(null)
    setForm({
      name: '',
      field: 'note',
      pattern: '',
      actionCategoryId: '',
      actionAccountId: '',
      actionTags: '',
      active: true
    })
    setShowForm(true)
  }

  const openEdit = (rule) => {
    setEditing(rule)
    setForm({
      name: rule.name,
      field: rule.field,
      pattern: rule.pattern,
      actionCategoryId: rule.actionCategoryId || '',
      actionAccountId: rule.actionAccountId || '',
      actionTags: (rule.actionTags || []).join(', '),
      active: rule.active
    })
    setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      name: form.name,
      field: form.field,
      pattern: form.pattern,
      actionCategoryId: form.actionCategoryId || undefined,
      actionAccountId: form.actionAccountId || undefined,
      actionTags: form.actionTags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      active: form.active
    }
    if (editing) updateRule(editing.id, data)
    else addRule(data)
    setShowForm(false)
  }

  return (
    <div className="animate-fade-in px-4 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-on-surface-variant">Automation</p>
          <h1 className="text-2xl font-bold text-on-surface">Rules</h1>
        </div>
      </header>

      <section className="mb-24 space-y-3">
        {rules.map((rule) => {
          const category = categories.find((c) => c.id === rule.actionCategoryId)
          const account = accounts.find((a) => a.id === rule.actionAccountId)
          return (
            <button
              key={rule.id}
              onClick={() => openEdit(rule)}
              className={`w-full rounded-2xl bg-surface p-4 text-left border ${
                rule.active ? 'border-outline-variant' : 'border-outline-variant opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary-container p-2 text-primary">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-on-surface">{rule.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      If {rule.field} contains "{rule.pattern}"
                    </p>
                  </div>
                </div>
                <span className={`text-xs ${rule.active ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {rule.active ? 'On' : 'Off'}
                </span>
              </div>
              {(category || account || rule.actionTags?.length > 0) && (
                <p className="mt-2 text-xs text-on-surface-variant">
                  → {category ? `category: ${category.name}` : ''}
                  {account ? ` account: ${account.name}` : ''}
                  {rule.actionTags?.length > 0 ? ` tags: ${rule.actionTags.join(', ')}` : ''}
                </p>
              )}
            </button>
          )
        })}
      </section>

      {rules.length === 0 && (
        <div className="py-16 text-center">
          <ShieldCheck size={40} className="mx-auto mb-3 text-on-surface-variant" />
          <p className="text-sm text-on-surface-variant">No rules yet.</p>
          <p className="mt-1 px-8 text-xs text-on-surface-variant">Create rules to automatically categorize transactions based on note, merchant, or amount.</p>
          <button onClick={openNew} className="mt-3 text-sm text-primary">Create rule</button>
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
              <h2 className="text-xl font-bold text-on-surface">{editing ? 'Edit Rule' : 'New Rule'}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full p-2 text-on-surface-variant">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Rule name"
                className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.field}
                  onChange={(e) => setForm({ ...form, field: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
                >
                  {FIELDS.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <input
                  required
                  value={form.pattern}
                  onChange={(e) => setForm({ ...form, pattern: e.target.value })}
                  placeholder="Contains..."
                  className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.actionCategoryId}
                  onChange={(e) => setForm({ ...form, actionCategoryId: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
                >
                  <option value="">Set category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select
                  value={form.actionAccountId}
                  onChange={(e) => setForm({ ...form, actionAccountId: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
                >
                  <option value="">Set account...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <input
                value={form.actionTags}
                onChange={(e) => setForm({ ...form, actionTags: e.target.value })}
                placeholder="Add tags (comma separated)"
                className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
              />
              <label className="flex items-center gap-3 text-sm text-on-surface">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-5 w-5 rounded border-outline-variant bg-surface text-primary"
                />
                Active
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              {editing && (
                <button
                  type="button"
                  onClick={() => { deleteRule(editing.id); setShowForm(false) }}
                  className="flex items-center gap-2 rounded-2xl bg-error/20 px-5 py-3 text-sm font-semibold text-error"
                >
                  <Trash2 size={16} /> Delete
                </button>
              )}
              <button type="submit" className="flex-1 rounded-2xl bg-primary py-3 text-sm font-semibold text-on-primary">
                {editing ? 'Save Changes' : 'Create Rule'}
              </button>
            </div>
          </form>
        </div>
        </ModalRoot>
      )}
    </div>
  )
}
