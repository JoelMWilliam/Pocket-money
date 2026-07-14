import { useMemo } from 'react'
import { Calendar as CalendarIcon, ArrowRight, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatLKR, todayInputDate } from '../lib/utils'

export default function CashFlow({ setScreen }) {
  const { accounts, transactions, recurring } = useAppStore()

  const totalBalance = useMemo(() => accounts.reduce((sum, a) => sum + (a.balance || 0), 0), [accounts])

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  const forecast = useMemo(() => {
    const days = []
    const dailyIncome = {}
    const dailyExpense = {}

    for (let i = 0; i < 60; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      days.push({ date: key, label: i === 0 ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }) })
      dailyIncome[key] = 0
      dailyExpense[key] = 0
    }

    // known future transactions (scheduled/income)
    transactions.forEach((t) => {
      if (t.date >= todayStr) {
        if (t.type === 'income') dailyIncome[t.date] = (dailyIncome[t.date] || 0) + t.amount
        if (t.type === 'expense') dailyExpense[t.date] = (dailyExpense[t.date] || 0) + t.amount
      }
    })

    // recurring items
    recurring
      .filter((r) => r.active)
      .forEach((r) => {
        const start = new Date(r.nextDueDate)
        if (isNaN(start.getTime())) return
        const freqDays = {
          weekly: 7,
          biweekly: 14,
          monthly: 30,
          quarterly: 91,
          yearly: 365
        }[r.frequency] || 30

        let cursor = new Date(start)
        while (cursor.toISOString().slice(0, 10) < todayStr) {
          cursor.setDate(cursor.getDate() + freqDays)
        }
        while (cursor.toISOString().slice(0, 10) <= days[days.length - 1].date) {
          const key = cursor.toISOString().slice(0, 10)
          if (r.type === 'income') dailyIncome[key] = (dailyIncome[key] || 0) + r.amount
          if (r.type === 'expense') dailyExpense[key] = (dailyExpense[key] || 0) + r.amount
          cursor.setDate(cursor.getDate() + freqDays)
        }
      })

    let running = totalBalance
    return days.map((d) => {
      const income = dailyIncome[d.date] || 0
      const expense = dailyExpense[d.date] || 0
      running = running + income - expense
      return { ...d, income, expense, balance: running }
    })
  }, [accounts, transactions, recurring, todayStr, totalBalance])

  const lowestPoint = useMemo(() => {
    if (forecast.length === 0) return null
    return forecast.reduce((min, d) => (d.balance < min.balance ? d : min), forecast[0])
  }, [forecast])

  const next7DaysTotal = useMemo(() => {
    return forecast.slice(0, 7).reduce((sum, d) => sum + d.income - d.expense, 0)
  }, [forecast])

  const highestSingleExpense = useMemo(() => {
    return forecast.reduce((max, d) => Math.max(max, d.expense), 0)
  }, [forecast])

  return (
    <div className="animate-fade-in px-4 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-on-surface-variant">Forecast</p>
          <h1 className="text-2xl font-bold text-on-surface">Cash Flow</h1>
        </div>
        <button
          onClick={() => setScreen('dashboard')}
          className="rounded-full bg-surface p-2 text-on-surface-variant"
        >
          <ArrowRight size={20} />
        </button>
      </header>

      <section className="mb-5 rounded-3xl bg-surface p-5 border border-outline-variant">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary-container p-3">
            <Wallet size={24} className="text-primary" />
          </div>
          <div>
            <p className="text-sm text-on-surface-variant">Projected Balance (60 days)</p>
            <p className="text-2xl font-bold text-on-surface">{formatLKR(forecast[forecast.length - 1]?.balance || 0)}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-surface-variant p-3">
            <p className="text-[10px] text-on-surface-variant">Next 7 Days</p>
            <p className={`text-sm font-semibold ${next7DaysTotal >= 0 ? 'text-green-400' : 'text-error'}`}>
              {next7DaysTotal >= 0 ? '+' : ''}{formatLKR(next7DaysTotal)}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-variant p-3">
            <p className="text-[10px] text-on-surface-variant">Lowest Point</p>
            <p className="text-sm font-semibold text-on-surface">{lowestPoint ? formatLKR(lowestPoint.balance) : '—'}</p>
          </div>
        </div>
        {lowestPoint && lowestPoint.balance < 0 && (
          <p className="mt-3 text-xs text-error">
            Projected negative balance on {new Date(lowestPoint.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.
          </p>
        )}
      </section>

      <section className="mb-5 rounded-2xl bg-surface p-4 border border-outline-variant">
        <h2 className="mb-3 text-base font-semibold text-on-surface">Upcoming Biggest Expense</h2>
        <div className="flex items-center justify-between rounded-2xl bg-surface p-3">
          <div className="flex items-center gap-2">
            <TrendingDown size={18} className="text-error" />
            <span className="text-sm text-on-surface">Single-day outflow</span>
          </div>
          <span className="text-sm font-semibold text-error">{formatLKR(highestSingleExpense)}</span>
        </div>
      </section>

      <section className="mb-24 rounded-2xl bg-surface p-4 border border-outline-variant">
        <div className="mb-3 flex items-center gap-2">
          <CalendarIcon size={18} className="text-primary" />
          <h2 className="text-base font-semibold text-on-surface">Daily Outlook</h2>
        </div>
        <div className="space-y-2">
          {forecast.slice(0, 30).map((day) => (
            <div
              key={day.date}
              className={`flex items-center justify-between rounded-xl p-3 ${day.date === todayStr ? 'bg-primary-container' : 'bg-surface'}`}
            >
              <div>
                <p className={`text-sm ${day.date === todayStr ? 'text-primary' : 'text-on-surface'}`}>{day.label}</p>
                <p className="text-[10px] text-on-surface-variant">{day.date}</p>
              </div>
              <div className="text-right">
                {day.income > 0 && (
                  <p className="flex items-center justify-end gap-1 text-xs text-green-400">
                    <TrendingUp size={12} /> +{formatLKR(day.income)}
                  </p>
                )}
                {day.expense > 0 && (
                  <p className="flex items-center justify-end gap-1 text-xs text-error">
                    <TrendingDown size={12} /> -{formatLKR(day.expense)}
                  </p>
                )}
                {day.income === 0 && day.expense === 0 && (
                  <p className="text-xs text-on-surface-variant">No activity</p>
                )}
                <p className="mt-0.5 text-sm font-semibold text-on-surface">{formatLKR(day.balance)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
