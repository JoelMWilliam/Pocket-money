import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, TrendingDown, Wallet, ArrowRight, Calendar, Sparkles, Award, AlertCircle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatLKR } from '../lib/utils'
import { AppleMultiBarChart, AppleDonutChart } from './ChartKit'

const REPORT_COLORS = ['#0A84FF', '#30D158', '#FF9500', '#BF5AF2', '#FF375F', '#64D2FF', '#FFCC00', '#5E5CE6']

export default function DailyReport({ onClose }) {
  const [period, setPeriod] = useState('daily')
  const [animateKey, setAnimateKey] = useState(0)
  const { transactions, accounts, categories, getTotalBalance } = useAppStore()

  const data = useMemo(() => {
    const now = new Date()
    let startDate, endDate, label

    if (period === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10)
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString().slice(0, 10)
      label = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    } else if (period === 'weekly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).toISOString().slice(0, 10)
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString().slice(0, 10)
      label = `Last 7 days`
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10)
      label = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }

    const periodTxns = transactions.filter((t) => t.date >= startDate && t.date < endDate)
    const income = periodTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = periodTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const net = income - expense

    const byCategory = {}
    periodTxns.filter((t) => t.type === 'expense').forEach((t) => {
      byCategory[t.categoryId] = (byCategory[t.categoryId] || 0) + t.amount
    })
    const categoryBreakdown = Object.entries(byCategory)
      .map(([id, amount]) => ({
        name: categories.find((c) => c.id === id)?.name || 'Other',
        amount,
        color: categories.find((c) => c.id === id)?.color || '#8E8E93'
      }))
      .sort((a, b) => b.amount - a.amount)

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const last30 = transactions.filter((t) => t.type === 'expense' && t.date >= thirtyDaysAgo && t.date < startDate)
    const avgDailyExpense = last30.length > 0 ? last30.reduce((s, t) => s + t.amount, 0) / 30 : 0
    const todayExpense = period === 'daily' ? expense : expense / (period === 'weekly' ? 7 : now.getDate())
    const savingsVsAverage = avgDailyExpense > 0 ? ((avgDailyExpense - todayExpense) / avgDailyExpense) * 100 : 0

    const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : now.getDate()
    const dailyData = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i).toISOString().slice(0, 10)
      const dayTxns = transactions.filter((t) => t.date === d)
      dailyData.push({
        date: d,
        label: new Date(d).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
        income: dayTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: dayTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        net: dayTxns.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0)
      })
    }

    return {
      label, income, expense, net, categoryBreakdown,
      avgDailyExpense, savingsVsAverage, dailyData,
      transactionCount: periodTxns.length,
      topCategory: categoryBreakdown[0] || null,
      totalBalance: getTotalBalance()
    }
  }, [period, transactions, categories, getTotalBalance])

  useEffect(() => {
    setAnimateKey((k) => k + 1)
  }, [period])

  const isSaving = data.savingsVsAverage > 0

  return (
    <div className="animate-screen-enter min-h-[100dvh] bg-surface pb-32">
      <div className="px-4 pt-6">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-container">
              <Sparkles size={24} className="text-primary" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{data.label}</p>
              <h1 className="text-2xl font-bold text-on-surface">Financial Report</h1>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-full bg-surface-variant p-2 text-on-surface-variant"
            >
              <ArrowRight size={20} className="rotate-180" />
            </button>
          )}
        </header>

        <div className="mb-6 flex rounded-2xl border border-outline-variant bg-surface p-1">
          {['daily', 'weekly', 'monthly'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium capitalize transition-all ${
                period === p ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div key={animateKey} className="stagger-children">
          <div className="mb-4 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-6 border border-outline-variant premium-card">
            <p className="text-sm font-medium text-on-surface-variant">Net Cash Flow</p>
            <p className={`mt-2 text-5xl font-bold tracking-tight animate-count-up ${data.net >= 0 ? 'text-green-400' : 'text-error'}`}>
              {data.net >= 0 ? '+' : ''}{formatLKR(data.net)}
            </p>
            <div className="mt-4 flex gap-3">
              <div className="flex flex-1 items-center gap-2 rounded-2xl bg-surface-variant px-3 py-2.5">
                <TrendingUp size={18} className="text-green-400" />
                <div>
                  <p className="text-[10px] text-on-surface-variant">Income</p>
                  <p className="text-sm font-semibold text-on-surface">{formatLKR(data.income)}</p>
                </div>
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-2xl bg-surface-variant px-3 py-2.5">
                <TrendingDown size={18} className="text-error" />
                <div>
                  <p className="text-[10px] text-on-surface-variant">Spent</p>
                  <p className="text-sm font-semibold text-on-surface">{formatLKR(data.expense)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4 rounded-3xl bg-surface p-6 border border-outline-variant">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-full bg-primary-container p-1.5 text-primary">
                {isSaving ? <Award size={16} /> : <AlertCircle size={16} />}
              </div>
              <h2 className="text-base font-semibold text-on-surface">Spending vs 30-Day Average</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-on-surface">{formatLKR(data.avgDailyExpense)}</p>
                <p className="text-xs text-on-surface-variant">Avg daily spend (30d)</p>
              </div>
              <div className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 ${isSaving ? 'bg-green-400/10' : 'bg-error/10'}`}>
                <span className={`text-2xl font-bold ${isSaving ? 'text-green-400' : 'text-error'}`}>
                  {isSaving ? '↓' : '↑'} {Math.abs(data.savingsVsAverage).toFixed(0)}%
                </span>
              </div>
            </div>
            <p className="mt-3 text-sm text-on-surface-variant">
              {isSaving
                ? `Great job! You're spending ${Math.abs(data.savingsVsAverage).toFixed(0)}% less than your 30-day average.`
                : `You're spending ${Math.abs(data.savingsVsAverage).toFixed(0)}% more than your 30-day average.`}
            </p>
          </div>

          {data.dailyData.length > 1 && (
            <div className="mb-4 rounded-3xl bg-surface p-6 border border-outline-variant card-lift">
              <h2 className="mb-4 text-base font-semibold text-on-surface">Daily Breakdown</h2>
              <AppleMultiBarChart
                data={data.dailyData}
                height={200}
                xKey="label"
                series={[
                  { key: 'expense', name: 'Expenses', color: 'var(--md-sys-color-error)' },
                  { key: 'income', name: 'Income', color: 'var(--md-sys-color-primary)' }
                ]}
                formatValue={(v) => formatLKR(v)}
              />
            </div>
          )}

          {data.categoryBreakdown.length > 0 && (
            <div className="mb-4 rounded-3xl bg-surface p-6 border border-outline-variant card-lift">
              <h2 className="mb-4 text-base font-semibold text-on-surface">Where Your Money Went</h2>
              <div className="flex items-center gap-4">
                <div className="w-1/2">
                  <AppleDonutChart
                    height={160}
                    innerRadius={42}
                    outerRadius={66}
                    paddingAngle={3}
                    data={data.categoryBreakdown.slice(0, 6).map((entry, i) => ({
                      name: entry.name,
                      value: entry.amount,
                      color: entry.color || REPORT_COLORS[i % REPORT_COLORS.length]
                    }))}
                    formatValue={(v) => formatLKR(v)}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  {data.categoryBreakdown.slice(0, 5).map((c, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                        <p className="text-xs text-on-surface">{c.name}</p>
                      </div>
                      <p className="text-xs font-semibold text-on-surface">{formatLKR(c.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mb-4 rounded-3xl bg-gradient-to-br from-secondary/20 to-transparent p-6 border border-outline-variant">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-on-surface-variant">Total Balance</p>
                <p className="mt-1 text-3xl font-bold text-on-surface">{formatLKR(data.totalBalance)}</p>
              </div>
              <div className="rounded-full bg-primary-container p-3">
                <Wallet size={28} className="text-primary" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-surface-variant p-3">
                <p className="text-[10px] text-on-surface-variant">Transactions</p>
                <p className="text-lg font-semibold text-on-surface">{data.transactionCount}</p>
              </div>
              <div className="rounded-2xl bg-surface-variant p-3">
                <p className="text-[10px] text-on-surface-variant">Top Category</p>
                <p className="text-sm font-semibold text-on-surface truncate">{data.topCategory?.name || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}