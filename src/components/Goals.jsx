import { useState } from 'react'
import { Plus, X, Trash2, Target, PiggyBank } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatLKR } from '../lib/utils'

export default function Goals() {
  const { goals, addGoal, updateGoal, deleteGoal } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const [form, setForm] = useState({
    name: '',
    target: '',
    current: '',
    deadline: '',
    color: '#0A84FF'
  })

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', target: '', current: '', deadline: '', color: '#0A84FF' })
    setShowForm(true)
  }

  const openEdit = (goal) => {
    setEditing(goal)
    setForm({
      name: goal.name,
      target: String(goal.target),
      current: String(goal.current),
      deadline: goal.deadline,
      color: goal.color
    })
    setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      name: form.name,
      target: Number(form.target) || 0,
      current: Number(form.current) || 0,
      deadline: form.deadline,
      color: form.color
    }
    if (editing) {
      updateGoal(editing.id, data)
    } else {
      addGoal(data)
    }
    setShowForm(false)
  }

  return (
    <div className="animate-fade-in px-4 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-on-surface-variant">Save towards</p>
          <h1 className="text-2xl font-bold text-on-surface">Goals</h1>
        </div>
        <button
          onClick={openNew}
          className="rounded-full bg-primary p-3 text-on-primary shadow-lg shadow-primary/20"
        >
          <Plus size={22} />
        </button>
      </header>

      <section className="space-y-4">
        {goals.map((goal) => {
          const percent = Math.min((goal.current / goal.target) * 100, 100)
          return (
            <button
              key={goal.id}
              onClick={() => openEdit(goal)}
              className="w-full rounded-2xl bg-surface p-4 text-left border border-outline-variant"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="rounded-xl p-2"
                    style={{ backgroundColor: `${goal.color}22` }}
                  >
                    <PiggyBank size={20} style={{ color: goal.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-on-surface">{goal.name}</p>
                    <p className="text-xs text-on-surface-variant">Target by {goal.deadline}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold" style={{ color: goal.color }}>
                  {Math.round(percent)}%
                </span>
              </div>

              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-on-surface">{formatLKR(goal.current)}</span>
                <span className="text-sm text-on-surface-variant">{formatLKR(goal.target)}</span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-black">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${percent}%`, backgroundColor: goal.color }}
                />
              </div>
            </button>
          )
        })}
      </section>

      {goals.length === 0 && (
        <div className="py-16 text-center">
          <Target size={40} className="mx-auto mb-3 text-on-surface-variant" />
          <p className="text-sm text-on-surface-variant">No goals yet.</p>
          <button onClick={openNew} className="mt-3 text-sm text-primary">Create a goal</button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md animate-slide-up rounded-t-3xl bg-surface p-6 border-t border-outline-variant"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface">{editing ? 'Edit Goal' : 'New Goal'}</h2>
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
                <label className="mb-1 block text-xs font-medium text-on-surface-variant">Goal Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-on-surface"
                  placeholder="e.g. Emergency Fund"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Target Amount</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={form.target}
                    onChange={(e) => setForm({ ...form, target: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-on-surface"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Saved So Far</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={form.current}
                    onChange={(e) => setForm({ ...form, current: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-on-surface"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-on-surface-variant">Deadline</label>
                <input
                  required
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-black px-4 py-3 text-on-surface"
                />
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
                  onClick={() => {
                    deleteGoal(editing.id)
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
                {editing ? 'Save Changes' : 'Create Goal'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
