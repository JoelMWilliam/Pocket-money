import { useState, useMemo } from 'react'
import { Sankey, Tooltip as RTooltip, ResponsiveContainer } from 'recharts'
import { AppleAreaChart, AppleLineChart, AppleMultiBarChart, PremiumTooltip } from './ChartKit'
import { Calendar, Store, TrendingUp, PieChart as PieChartIcon, Target } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatLKR, getCurrentMonth } from '../lib/utils'

const TABS = [
  { id: 'sankey', label: 'Sankey', icon: PieChartIcon },
  { id: 'forecast', label: 'Forecast', icon: TrendingUp },
  { id: 'merchants', label: 'Merchants', icon: Store },
  { id: 'heatmap', label: 'Heatmap', icon: Calendar },
  { id: 'networth', label: 'Net Worth', icon: Target },
  { id: 'budgetactual', label: 'Budget vs Actual', icon: Target }
]

export default function AdvancedReports() {
  const { transactions, categories, budgets, accounts, debts } = useAppStore()
  const [activeTab, setActiveTab] = useState('sankey')
  const [month, setMonth] = useState(getCurrentMonth())

  const monthlyTransactions = useMemo(() =>
    transactions.filter((t) => t.date.startsWith(month)),
  [transactions, month])

  const incomeTotal = monthlyTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const expenseTotal = monthlyTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const categoryTotals = useMemo(() => {
    const map = {}
    monthlyTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map[t.categoryId] = (map[t.categoryId] || 0) + t.amount
      })
    return Object.entries(map)
      .map(([id, value]) => {
        const cat = categories.find((c) => c.id === id)
        return { name: cat?.name || 'Unknown', value, color: cat?.color || '#8e8e93' }
      })
      .sort((a, b) => b.value - a.value)
  }, [monthlyTransactions, categories])

  const merchantAnalysis = useMemo(() => {
    const map = {}
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const key = (t.note || 'Unknown').trim()
        if (!key) return
        if (!map[key]) {
          map[key] = { name: key, count: 0, total: 0, dates: [] }
        }
        map[key].count += 1
        map[key].total += t.amount
        map[key].dates.push(t.date)
      })
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 20)
  }, [transactions])

  const cashFlowForecast = useMemo(() => {
    const data = []
    const today = new Date()
    let balance = accounts.reduce((sum, a) => sum + a.balance, 0)
    const avgIncome = incomeTotal
    const avgExpense = expenseTotal

    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
      const label = d.toLocaleDateString('en-GB', { month: 'short' })
      if (i === 0) {
        balance = accounts.reduce((sum, a) => sum + a.balance, 0)
      } else {
        balance += avgIncome - avgExpense
      }
      data.push({ month: label, balance: Math.max(0, balance), income: avgIncome, expense: avgExpense })
    }
    return data
  }, [accounts, incomeTotal, expenseTotal])

  const netWorthHistory = useMemo(() => {
    const data = []
    const now = new Date()
    const allTx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date))
    let balance = 0

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toISOString().slice(0, 7)
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)

      allTx.forEach((t) => {
        if (t.date > monthEnd) return
        if (t.type === 'income') balance += t.amount
        else if (t.type === 'expense') balance -= t.amount
        else if (t.type === 'transfer') {
          // transfers don't change net worth
        }
      })

      data.push({
        month: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
        netWorth: balance
      })
      balance = 0
    }
    return data
  }, [transactions])

  const heatmapData = useMemo(() => {
    const map = {}
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map[t.date] = (map[t.date] || 0) + t.amount
      })
    return map
  }, [transactions])

  const budgetVsActual = useMemo(() => {
    return budgets.map((b) => {
      const cat = categories.find((c) => c.id === b.categoryId)
      const spent = monthlyTransactions
        .filter((t) => t.type === 'expense' && t.categoryId === b.categoryId)
        .reduce((sum, t) => sum + t.amount, 0)
      return {
        name: cat?.name || 'Unknown',
        budget: b.amount,
        actual: spent,
        color: cat?.color || '#8e8e93'
      }
    })
  }, [budgets, categories, monthlyTransactions])

  const sankeyData = useMemo(() => {
    const nodes = [{ name: 'Income' }]
    categoryTotals.forEach((c) => nodes.push({ name: c.name }))
    const links = categoryTotals.map((c, index) => ({
      source: 0,
      target: index + 1,
      value: c.value
    }))
    return { nodes, links }
  }, [categoryTotals, incomeTotal])

  const renderSankey = () => (
    <div className="rounded-3xl bg-surface p-5 border border-outline-variant card-lift">
      <h2 className="mb-3 text-base font-semibold text-on-surface">Income → Expenses Flow</h2>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={sankeyData}
            nodePadding={20}
            linkCurvature={0.5}
            nodeWidth={10}
            iterations={64}
          >
            <RTooltip content={<PremiumTooltip formatter={(v) => formatLKR(v)} />} />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  )

  const renderForecast = () => (
    <div className="rounded-3xl bg-surface p-5 border border-outline-variant card-lift">
      <h2 className="mb-3 text-base font-semibold text-on-surface">6-Month Cash Flow Forecast</h2>
      <AppleAreaChart
        data={cashFlowForecast}
        dataKey="balance"
        xKey="month"
        height={220}
        color="var(--md-sys-color-primary)"
        formatValue={(v) => formatLKR(v)}
      />
    </div>
  )

  const renderMerchants = () => (
    <div className="space-y-3">
      {merchantAnalysis.slice(0, 10).map((m) => (
        <div key={m.name} className="rounded-2xl bg-surface p-4 border border-outline-variant">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-on-surface truncate pr-4">{m.name}</p>
            <p className="text-sm font-semibold text-on-surface">{formatLKR(m.total)}</p>
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">{m.count} transactions · avg {formatLKR(m.total / m.count)}</p>
        </div>
      ))}
    </div>
  )

  const renderHeatmap = () => {
    const today = new Date()
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const days = []
    for (let i = 1; i <= daysInMonth; i++) {
      const date = `${today.toISOString().slice(0, 7)}-${String(i).padStart(2, '0')}`
      days.push({ date, amount: heatmapData[date] || 0, day: i })
    }
    const max = Math.max(...days.map((d) => d.amount), 1)

    return (
      <div className="rounded-2xl bg-surface p-4 border border-outline-variant">
        <h2 className="mb-3 text-base font-semibold text-on-surface">Daily Spending Heatmap</h2>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => (
            <div
              key={d.date}
              className="aspect-square rounded-lg flex items-center justify-center text-[10px]"
              style={{
                backgroundColor: d.amount > 0 ? `rgba(10, 132, 255, ${Math.max(0.15, d.amount / max)})` : '#0a0a0a'
              }}
            >
              <span className={d.amount > 0 ? 'text-white' : 'text-on-surface-variant'}>{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderNetWorth = () => (
    <div className="rounded-3xl bg-surface p-5 border border-outline-variant card-lift">
      <h2 className="mb-3 text-base font-semibold text-on-surface">Net Worth History</h2>
      <AppleLineChart
        data={netWorthHistory}
        height={220}
        xKey="month"
        series={[{ key: 'netWorth', name: 'Net Worth', color: 'var(--md-sys-color-primary)' }]}
        formatValue={(v) => formatLKR(v)}
      />
    </div>
  )

  const renderBudgetActual = () => (
    <div className="rounded-3xl bg-surface p-5 border border-outline-variant card-lift">
      <h2 className="mb-3 text-base font-semibold text-on-surface">Budget vs Actual</h2>
      <AppleMultiBarChart
        data={budgetVsActual}
        height={220}
        xKey="name"
        series={[
          { key: 'budget', name: 'Budget', color: '#30D158' },
          { key: 'actual', name: 'Actual', color: '#FF375F' }
        ]}
        formatValue={(v) => formatLKR(v)}
      />
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'sankey': return renderSankey()
      case 'forecast': return renderForecast()
      case 'merchants': return renderMerchants()
      case 'heatmap': return renderHeatmap()
      case 'networth': return renderNetWorth()
      case 'budgetactual': return renderBudgetActual()
      default: return renderSankey()
    }
  }

  return (
    <div className="animate-fade-in px-4 pt-6">
      <header className="mb-4">
        <p className="text-sm text-on-surface-variant">Deep insights</p>
        <h1 className="text-2xl font-bold text-on-surface">Advanced Reports</h1>
      </header>

      <div className="mb-4">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm text-on-surface"
        />
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium ${
                active ? 'bg-primary text-on-primary' : 'bg-surface text-on-surface-variant border border-outline-variant'
              }`}
            >
              <Icon size={14} /> {tab.label}
            </button>
          )
        })}
      </div>

      <section className="mb-24">
        {renderContent()}
      </section>
    </div>
  )
}
