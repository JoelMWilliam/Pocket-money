import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Wallet, ArrowRight, PiggyBank, Lightbulb } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatLKR, getCurrentMonth } from '../lib/utils'
import TransactionItem from './TransactionItem'

export default function Dashboard({ setScreen }) {
  const { accounts, transactions, goals, budgets, categories, getMonthlyTotals, getTotalBalance } =
    useAppStore()

  const totalBalance = getTotalBalance()
  const { income, expense } = getMonthlyTotals(getCurrentMonth())
  const recentTransactions = transactions.slice(0, 5)

  const insights = useMemo(() => {
    const month = getCurrentMonth()
    const monthExpenses = transactions.filter((t) => t.type === 'expense' && t.date.startsWith(month))
    const byCategory = {}
    monthExpenses.forEach((t) => {
      byCategory[t.categoryId] = (byCategory[t.categoryId] || 0) + t.amount
    })
    const topCategoryId = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]
    const topCategory = topCategoryId ? categories.find((c) => c.id === topCategoryId[0]) : null
    const topCategoryAmount = topCategoryId ? topCategoryId[1] : 0

    const today = new Date().getDate()
    const dailyAverage = today > 0 ? expense / today : 0

    const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 7)
    const lastMonthExpense = transactions
      .filter((t) => t.type === 'expense' && t.date.startsWith(lastMonth))
      .reduce((sum, t) => sum + t.amount, 0)
    const change = lastMonthExpense > 0 ? ((expense - lastMonthExpense) / lastMonthExpense) * 100 : 0

    return { topCategory, topCategoryAmount, dailyAverage, change, lastMonthExpense }
  }, [transactions, categories, expense])

  const netWorth = useMemo(() => {
    return accounts.reduce((sum, a) => sum + a.balance, 0)
  }, [accounts])

  const safeToSpend = useMemo(() => {
    const budgeted = budgets.reduce((sum, b) => sum + b.amount, 0)
    const upcoming = transactions
      .filter(
        (t) =>
          t.type === 'expense' &&
          t.date >= new Date().toISOString().slice(0, 10) &&
          t.date <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      )
      .reduce((sum, t) => sum + t.amount, 0)
    return Math.max(totalBalance - budgeted - upcoming, 0)
  }, [totalBalance, budgets, transactions])

  const topGoals = goals.slice(0, 2)

  return (
    <div className="animate-fade-in px-4 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-on-surface-variant">Good day</p>
          <h1 className="text-2xl font-bold text-on-surface">Pocket Money</h1>
        </div>
        <button
          onClick={() => setScreen('settings')}
          className="rounded-full bg-surface p-2 text-on-surface-variant"
        >
          <Wallet size={20} />
        </button>
      </header>

      {/* Net Worth Card */}
      <section className="mb-5 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 p-6 border border-outline-variant">
        <p className="text-sm font-medium text-on-surface-variant">Total Balance</p>
        <p className="mt-1 text-4xl font-bold tracking-tight text-on-surface">{formatLKR(netWorth)}</p>
        <div className="mt-4 flex gap-4">
          <div className="flex items-center gap-2 rounded-2xl bg-black/30 px-3 py-2">
            <TrendingUp size={16} className="text-primary" />
            <div>
              <p className="text-[10px] text-on-surface-variant">Income</p>
              <p className="text-sm font-semibold text-on-surface">{formatLKR(income)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-black/30 px-3 py-2">
            <TrendingDown size={16} className="text-error" />
            <div>
              <p className="text-[10px] text-on-surface-variant">Spent</p>
              <p className="text-sm font-semibold text-on-surface">{formatLKR(expense)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Safe to Spend */}
      <section className="mb-5 rounded-3xl bg-surface p-5 border border-outline-variant">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-on-surface-variant">Safe to Spend</p>
            <p className="mt-1 text-3xl font-bold text-on-surface">{formatLKR(safeToSpend)}</p>
          </div>
          <div className="rounded-full bg-primary-container p-3">
            <Wallet size={24} className="text-primary" />
          </div>
        </div>
        <p className="mt-3 text-xs text-on-surface-variant">
          After upcoming bills and goals, this is what you can safely use.
        </p>
      </section>

      {/* Spending Insights */}
      <section className="mb-5 rounded-3xl bg-surface p-5 border border-outline-variant">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-full bg-primary-container p-1.5 text-primary">
            <Lightbulb size={16} />
          </div>
          <h2 className="text-base font-semibold text-on-surface">This Month</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-black p-3">
            <p className="text-xs text-on-surface-variant">Top Category</p>
            <p className="text-sm font-semibold text-on-surface truncate">{insights.topCategory?.name || 'None'}</p>
            <p className="text-xs text-on-surface-variant">{formatLKR(insights.topCategoryAmount)}</p>
          </div>
          <div className="rounded-2xl bg-black p-3">
            <p className="text-xs text-on-surface-variant">Daily Average</p>
            <p className="text-sm font-semibold text-on-surface">{formatLKR(insights.dailyAverage)}</p>
          </div>
        </div>
        {insights.lastMonthExpense > 0 && (
          <p className={`mt-3 text-xs ${insights.change > 0 ? 'text-error' : 'text-green-400'}`}>
            You are spending {Math.abs(insights.change).toFixed(0)}% {insights.change > 0 ? 'more' : 'less'} than last month.
          </p>
        )}
      </section>

      {/* Accounts Quick View */}
      <section className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-on-surface">Accounts</h2>
          <button
            onClick={() => setScreen('accounts')}
            className="flex items-center gap-1 text-sm text-primary"
          >
            See all <ArrowRight size={14} />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {accounts.slice(0, 4).map((account) => (
            <button
              key={account.id}
              onClick={() => setScreen('accounts')}
              className="min-w-[140px] rounded-2xl bg-surface p-4 text-left border border-outline-variant"
            >
              <p className="text-xs text-on-surface-variant truncate">{account.name}</p>
              <p className="mt-1 text-lg font-bold text-on-surface truncate">{formatLKR(account.balance)}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Goals Preview */}
      {topGoals.length > 0 && (
        <section className="mb-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-on-surface">Goals</h2>
            <button
              onClick={() => setScreen('goals')}
              className="flex items-center gap-1 text-sm text-primary"
            >
              See all <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {topGoals.map((goal) => (
              <button
                key={goal.id}
                onClick={() => setScreen('goals')}
                className="w-full rounded-2xl bg-surface p-4 text-left border border-outline-variant"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-full p-2"
                      style={{ backgroundColor: `${goal.color}22` }}
                    >
                      <PiggyBank size={18} style={{ color: goal.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-on-surface">{goal.name}</p>
                      <p className="text-xs text-on-surface-variant">
                        {formatLKR(goal.current)} of {formatLKR(goal.target)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: goal.color }}>
                    {Math.round((goal.current / goal.target) * 100)}%
                  </span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((goal.current / goal.target) * 100, 100)}%`,
                      backgroundColor: goal.color
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Recent Transactions */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-on-surface">Recent Transactions</h2>
          <button
            onClick={() => setScreen('transactions')}
            className="flex items-center gap-1 text-sm text-primary"
          >
            See all <ArrowRight size={14} />
          </button>
        </div>
        <div className="space-y-2">
          {recentTransactions.length > 0 ? (
            recentTransactions.map((t) => (
              <TransactionItem key={t.id} transaction={t} />
            ))
          ) : (
            <p className="py-8 text-center text-sm text-on-surface-variant">No transactions yet.</p>
          )}
        </div>
      </section>
    </div>
  )
}
