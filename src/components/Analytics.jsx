import { useMemo, useState } from 'react'
import { AppleLineChart, AppleMultiBarChart } from './ChartKit'
import { useAppStore } from '../store/useAppStore'
import { formatLKR, getCurrentMonth } from '../lib/utils'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function Analytics() {
  const { transactions, categories } = useAppStore()
  const [month, setMonth] = useState(getCurrentMonth())

  const monthlyTotals = useMemo(() => {
    let income = 0
    let expense = 0
    transactions.forEach((t) => {
      if (!t.date.startsWith(month)) return
      if (t.type === 'income') income += t.amount
      if (t.type === 'expense') expense += t.amount
    })
    return { income, expense }
  }, [transactions, month])

  const categoryData = useMemo(() => {
    const map = {}
    transactions.forEach((t) => {
      if (t.type !== 'expense' || !t.date.startsWith(month)) return
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amount
    })
    return Object.entries(map)
      .map(([categoryId, value]) => {
        const category = categories.find((c) => c.id === categoryId)
        return { name: category?.name || 'Unknown', value, color: category?.color || '#8e8e93' }
      })
      .sort((a, b) => b.value - a.value)
  }, [transactions, categories, month])

  const last6Months = useMemo(() => {
    const data = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toISOString().slice(0, 7)
      let income = 0
      let expense = 0
      transactions.forEach((t) => {
        if (!t.date.startsWith(key)) return
        if (t.type === 'income') income += t.amount
        if (t.type === 'expense') expense += t.amount
      })
      data.push({
        month: d.toLocaleDateString('en-GB', { month: 'short' }),
        income,
        expense
      })
    }
    return data
  }, [transactions])

  const categoryTrends = useMemo(() => {
    const months = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleDateString('en-GB', { month: 'short' }) })
    }
    const expenseCategories = categories.filter((c) => c.type === 'expense')
    const data = months.map((m) => {
      const row = { month: m.label }
      expenseCategories.forEach((c) => {
        row[c.name] = transactions
          .filter((t) => t.date.startsWith(m.key) && t.type === 'expense' && t.categoryId === c.id)
          .reduce((sum, t) => sum + t.amount, 0)
      })
      return row
    })
    const totals = expenseCategories
      .map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        total: transactions.filter((t) => t.type === 'expense' && t.categoryId === c.id).reduce((sum, t) => sum + t.amount, 0)
      }))
      .sort((a, b) => b.total - a.total)
    return { data, topCategories: totals.slice(0, 4) }
  }, [transactions, categories])

  const categoryChange = useMemo(() => {
    const now = new Date()
    const currentKey = now.toISOString().slice(0, 7)
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevKey = prev.toISOString().slice(0, 7)
    return categories
      .filter((c) => c.type === 'expense')
      .map((c) => {
        const current = transactions
          .filter((t) => t.date.startsWith(currentKey) && t.type === 'expense' && t.categoryId === c.id)
          .reduce((sum, t) => sum + t.amount, 0)
        const previous = transactions
          .filter((t) => t.date.startsWith(prevKey) && t.type === 'expense' && t.categoryId === c.id)
          .reduce((sum, t) => sum + t.amount, 0)
        const change = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0
        return { name: c.name, current, previous, change, color: c.color }
      })
      .filter((c) => c.current > 0 || c.previous > 0)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 4)
  }, [transactions, categories])

  return (
    <div className="animate-fade-in px-4 pt-6">
      <header className="mb-6">
        <p className="text-sm text-on-surface-variant">Insights</p>
        <h1 className="text-2xl font-bold text-on-surface">Analytics</h1>
      </header>

      <div className="mb-5">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-2xl border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface"
        />
      </div>

      <section className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-surface p-5 border border-outline-variant card-lift">
          <p className="text-xs text-on-surface-variant">Income</p>
          <p className="mt-1 text-xl font-bold text-primary">{formatLKR(monthlyTotals.income)}</p>
        </div>
        <div className="rounded-3xl bg-surface p-5 border border-outline-variant card-lift">
          <p className="text-xs text-on-surface-variant">Expenses</p>
          <p className="mt-1 text-xl font-bold text-on-surface">{formatLKR(monthlyTotals.expense)}</p>
        </div>
      </section>

      {categoryData.length > 0 && (
        <section className="mb-5 rounded-3xl bg-surface p-5 border border-outline-variant card-lift">
          <h2 className="mb-3 text-base font-semibold text-on-surface">Spending by Category</h2>
          <div className="space-y-3">
            {categoryData.slice(0, 6).map((item) => {
              const percent = monthlyTotals.expense > 0 ? (item.value / monthlyTotals.expense) * 100 : 0
              return (
                <div key={item.name}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="truncate text-on-surface">{item.name}</span>
                    </div>
                    <span className="shrink-0 font-medium text-on-surface">{formatLKR(item.value)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-variant">
                    <div
                      className="h-full rounded-full transition-all animate-progress-fill"
                      style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="mb-5 rounded-3xl bg-surface p-5 border border-outline-variant card-lift">
        <h2 className="mb-3 text-base font-semibold text-on-surface">Category Trends</h2>
        <AppleLineChart
          data={categoryTrends.data}
          height={180}
          xKey="month"
          series={categoryTrends.topCategories.map((c) => ({ key: c.name, name: c.name, color: c.color }))}
          formatValue={(v) => formatLKR(v)}
        />
        {categoryTrends.topCategories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {categoryTrends.topCategories.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name}
              </div>
            ))}
          </div>
        )}
      </section>

      {categoryChange.length > 0 && (
        <section className="mb-5 rounded-3xl bg-surface p-5 border border-outline-variant card-lift">
          <h2 className="mb-3 text-base font-semibold text-on-surface">Month-over-Month Changes</h2>
          <div className="space-y-3">
            {categoryChange.map((c) => (
              <div key={c.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="truncate text-sm text-on-surface">{c.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm text-on-surface-variant">{formatLKR(c.current)}</span>
                  <span
                    className={`flex items-center gap-0.5 text-xs font-medium ${c.change >= 0 ? 'text-error' : 'text-green-400'}`}
                  >
                    {c.change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(c.change).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-24 rounded-3xl bg-surface p-5 border border-outline-variant card-lift">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-on-surface">6 Month Trend</h2>
          <div className="flex items-center gap-3 text-[10px] font-medium text-on-surface-variant">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--md-sys-color-primary)' }} />Income</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--md-sys-color-error)' }} />Expenses</span>
          </div>
        </div>
        <AppleMultiBarChart
          data={last6Months}
          height={180}
          xKey="month"
          series={[
            { key: 'income', name: 'Income', color: 'var(--md-sys-color-primary)' },
            { key: 'expense', name: 'Expenses', color: 'var(--md-sys-color-error)' }
          ]}
          formatValue={(v) => formatLKR(v)}
        />
      </section>
    </div>
  )
}