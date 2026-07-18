import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Wallet, ArrowRight, PiggyBank, Lightbulb, Calendar, AlertCircle, User, Plus, X, GripVertical, BarChart3, PieChart as PieChartIcon, Target, CreditCard, Sparkles, Layout } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatLKR, getCurrentMonth } from '../lib/utils'
import TransactionItem from './TransactionItem'
import UserSwitcher from './UserSwitcher'
import { useRegisterQuickAdd } from '../contexts/QuickAddContext'
import { AppleBarChart, AppleDonutChart } from './ChartKit'
import DashboardTipCard, { TipsDiscover } from './Tips'

const DEFAULT_CARDS = ['balance', 'safeToSpend', 'insights', 'recentTransactions', 'accounts', 'goals', 'upcomingBills']

const AVAILABLE_CARDS = [
  { id: 'balance', name: 'Total Balance', icon: Wallet },
  { id: 'safeToSpend', name: 'Safe to Spend', icon: CreditCard },
  { id: 'insights', name: 'Spending Insights', icon: Lightbulb },
  { id: 'recentTransactions', name: 'Recent Transactions', icon: TrendingUp },
  { id: 'accounts', name: 'Accounts', icon: Wallet },
  { id: 'goals', name: 'Goals', icon: Target },
  { id: 'upcomingBills', name: 'Upcoming Bills', icon: Calendar },
  { id: 'spendingChart', name: 'Spending Chart', icon: BarChart3 },
  { id: 'categoryPie', name: 'Category Breakdown', icon: PieChartIcon },
]

export default function Dashboard({ setScreen, onAddTransaction }) {
  useRegisterQuickAdd(onAddTransaction)
  const [editing, setEditing] = useState(false)
  const [discoverOpen, setDiscoverOpen] = useState(false)
  const { auth, accounts, transactions, goals, budgets, categories, recurring, getMonthlyTotals, getTotalBalance, settings, updateSettings } =
    useAppStore()

  const cardOrder = settings?.dashboardCards || DEFAULT_CARDS

  const totalBalance = getTotalBalance()
  const { income, expense } = getMonthlyTotals(getCurrentMonth())
  const recentTransactions = transactions.slice(0, 5)
  const greeting = auth.currentUser ? `Good day, ${auth.currentUser}` : 'Good day'

  const insights = useMemo(() => {
    const month = getCurrentMonth()
    const monthExpenses = transactions.filter((t) => t.type === 'expense' && t.date.startsWith(month))
    const byCategory = {}
    monthExpenses.forEach((t) => { byCategory[t.categoryId] = (byCategory[t.categoryId] || 0) + t.amount })
    const topCategoryId = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]
    const topCategory = topCategoryId ? categories.find((c) => c.id === topCategoryId[0]) : null
    const topCategoryAmount = topCategoryId ? topCategoryId[1] : 0
    const today = new Date().getDate()
    const dailyAverage = today > 0 ? expense / today : 0
    const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 7)
    const lastMonthExpense = transactions.filter((t) => t.type === 'expense' && t.date.startsWith(lastMonth)).reduce((sum, t) => sum + t.amount, 0)
    const change = lastMonthExpense > 0 ? ((expense - lastMonthExpense) / lastMonthExpense) * 100 : 0
    return { topCategory, topCategoryAmount, dailyAverage, change, lastMonthExpense, byCategory }
  }, [transactions, categories, expense])

  const netWorth = useMemo(() => accounts.reduce((sum, a) => sum + a.balance, 0), [accounts])

  const safeToSpend = useMemo(() => {
    const budgeted = budgets.reduce((sum, b) => sum + b.amount, 0)
    const upcoming = transactions
      .filter((t) => t.type === 'expense' && t.date >= new Date().toISOString().slice(0, 10) && t.date <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
      .reduce((sum, t) => sum + t.amount, 0)
    return Math.max(totalBalance - budgeted - upcoming, 0)
  }, [totalBalance, budgets, transactions])

  const topGoals = goals.slice(0, 2)
  const todayStr = new Date().toISOString().slice(0, 10)
  const next7Days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const upcomingBills = useMemo(() => {
    return recurring.filter((r) => r.active && r.type === 'expense' && r.nextDueDate >= todayStr && r.nextDueDate <= next7Days).sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
  }, [recurring, todayStr, next7Days])
  const upcomingTotal = upcomingBills.reduce((sum, r) => sum + r.amount, 0)
  const currentUser = auth.users?.[auth.currentUser]
  const avatar = currentUser?.avatar

  const toggleCard = (id) => {
    const newOrder = cardOrder.includes(id) ? cardOrder.filter((c) => c !== id) : [...cardOrder, id]
    updateSettings({ dashboardCards: newOrder })
  }

  const moveCard = (id, dir) => {
    const idx = cardOrder.indexOf(id)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= cardOrder.length) return
    const newOrder = [...cardOrder]
    const [item] = newOrder.splice(idx, 1)
    newOrder.splice(newIdx, 0, item)
    updateSettings({ dashboardCards: newOrder })
  }

  const renderCard = (cardId) => {
    switch (cardId) {
      case 'balance':
        return (
          <section key="balance" className="mb-5 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 p-6 border border-outline-variant premium-card card-lift">
            <p className="text-sm font-medium text-on-surface-variant">Total Balance</p>
            <p className="mt-1 text-4xl font-bold tracking-tight text-on-surface animate-count-up">{formatLKR(netWorth)}</p>
            <div className="mt-4 flex gap-4">
              <div className="flex items-center gap-2 rounded-2xl bg-surface-variant px-3 py-2">
                <TrendingUp size={16} className="text-primary" />
                <div><p className="text-[10px] text-on-surface-variant">Income</p><p className="text-sm font-semibold text-on-surface">{formatLKR(income)}</p></div>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-surface-variant px-3 py-2">
                <TrendingDown size={16} className="text-error" />
                <div><p className="text-[10px] text-on-surface-variant">Spent</p><p className="text-sm font-semibold text-on-surface">{formatLKR(expense)}</p></div>
              </div>
            </div>
          </section>
        )
      case 'safeToSpend':
        return (
          <section key="safeToSpend" className="mb-5 rounded-3xl bg-surface p-5 border border-outline-variant card-lift">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-on-surface-variant">Safe to Spend</p><p className="mt-1 text-3xl font-bold text-on-surface">{formatLKR(safeToSpend)}</p></div>
              <div className="rounded-full bg-primary-container p-3"><Wallet size={24} className="text-primary" /></div>
            </div>
            <p className="mt-3 text-xs text-on-surface-variant">After upcoming bills and goals, this is what you can safely use.</p>
          </section>
        )
      case 'insights':
        return (
          <section key="insights" className="mb-5 rounded-3xl bg-surface p-5 border border-outline-variant card-lift">
            <div className="mb-3 flex items-center gap-2"><div className="rounded-full bg-primary-container p-1.5 text-primary"><Lightbulb size={16} /></div><h2 className="text-base font-semibold text-on-surface">This Month</h2></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-surface p-3"><p className="text-xs text-on-surface-variant">Top Category</p><p className="text-sm font-semibold text-on-surface truncate">{insights.topCategory?.name || 'None'}</p><p className="text-xs text-on-surface-variant">{formatLKR(insights.topCategoryAmount)}</p></div>
              <div className="rounded-2xl bg-surface p-3"><p className="text-xs text-on-surface-variant">Daily Average</p><p className="text-sm font-semibold text-on-surface">{formatLKR(insights.dailyAverage)}</p></div>
            </div>
            {insights.lastMonthExpense > 0 && <p className={`mt-3 text-xs ${insights.change > 0 ? 'text-error' : 'text-green-400'}`}>You are spending {Math.abs(insights.change).toFixed(0)}% {insights.change > 0 ? 'more' : 'less'} than last month.</p>}
          </section>
        )
      case 'spendingChart':
        return (
          <section key="spendingChart" className="mb-5 rounded-3xl bg-surface p-5 border border-outline-variant card-lift">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-on-surface">Spending (7 days)</h2>
              <span className="text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">This week</span>
            </div>
            <AppleBarChart
              data={Array.from({ length: 7 }, (_, i) => {
                const date = new Date()
                date.setDate(date.getDate() - (6 - i))
                const d = date.toISOString().slice(0, 10)
                const amt = transactions
                  .filter((t) => t.type === 'expense' && t.date.startsWith(d))
                  .reduce((s, t) => s + t.amount, 0)
                return { label: date.toLocaleDateString('en-US', { weekday: 'short' }), amount: amt, date: d }
              })}
              dataKey="amount"
              xKey="label"
              height={170}
              color="var(--md-sys-color-primary)"
              radius={9}
              formatValue={(v) => formatLKR(v)}
              formatLabel={(label, payload) => payload?.[0]?.payload?.date || label}
              onBarClick={() => setScreen('transactions')}
            />
          </section>
        )
case 'categoryPie':
        return (
          <section key="categoryPie" className="mb-5 rounded-3xl bg-surface p-5 border border-outline-variant card-lift">
            <h2 className="mb-3 text-base font-semibold text-on-surface">Category Breakdown</h2>
            {Object.keys(insights.byCategory).length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="w-1/2">
                  <AppleDonutChart
                    height={180}
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                    data={Object.entries(insights.byCategory).map(([id, amt]) => ({
                      name: categories.find((c) => c.id === id)?.name || 'Other',
                      value: amt,
                      color: categories.find((c) => c.id === id)?.color || '#8E8E93',
                      id
                    }))}
                    formatValue={(v) => formatLKR(v)}
                    onClick={() => setScreen('categories')}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  {Object.entries(insights.byCategory)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([id, amt]) => {
                      const cat = categories.find((c) => c.id === id)
                      const total = Object.values(insights.byCategory).reduce((s, v) => s + v, 0)
                      const pct = total > 0 ? Math.round((amt / total) * 100) : 0
                      return (
                        <div key={id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat?.color || '#8E8E93' }} />
                            <p className="text-xs text-on-surface truncate max-w-[80px]">{cat?.name || 'Other'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-on-surface">{formatLKR(amt)}</p>
                            <p className="text-[10px] text-on-surface-variant">{pct}%</p>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            ) : <p className="py-8 text-center text-sm text-on-surface-variant">No spending this month.</p>}
          </section>
        )
      case 'upcomingBills':
        return upcomingBills.length > 0 ? (
          <section key="upcomingBills" className="mb-5 rounded-3xl bg-surface p-5 border border-outline-variant card-lift">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="rounded-full bg-primary-container p-1.5 text-primary"><Calendar size={16} /></div><h2 className="text-base font-semibold text-on-surface">Upcoming Bills</h2></div>
              <button onClick={() => setScreen('recurring')} className="flex items-center gap-1 text-sm text-primary">See all <ArrowRight size={14} /></button>
            </div>
            <div className="mb-3 rounded-2xl bg-surface p-3"><p className="text-xs text-on-surface-variant">Due in next 7 days</p><p className="text-lg font-semibold text-on-surface">{formatLKR(upcomingTotal)}</p></div>
            <div className="space-y-2">
              {upcomingBills.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl bg-surface p-3">
                  <div className="flex items-center gap-2"><AlertCircle size={14} className="text-primary" /><p className="text-sm text-on-surface">{item.name}</p></div>
                  <div className="text-right"><p className="text-sm font-semibold text-on-surface">{formatLKR(item.amount)}</p><p className="text-[10px] text-on-surface-variant">{item.nextDueDate}</p></div>
                </div>
              ))}
            </div>
          </section>
        ) : null
      case 'accounts':
        return (
          <section key="accounts" className="mb-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold text-on-surface">Accounts</h2><button onClick={() => setScreen('accounts')} className="flex items-center gap-1 text-sm text-primary">See all <ArrowRight size={14} /></button></div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {accounts.slice(0, 4).map((account) => (
                <button key={account.id} onClick={() => setScreen('accounts')} className="min-w-[140px] rounded-2xl bg-surface p-4 text-left border border-outline-variant card-lift">
                  <p className="text-xs text-on-surface-variant truncate">{account.name}</p>
                  <p className="mt-1 text-lg font-bold text-on-surface truncate">{formatLKR(account.balance)}</p>
                </button>
              ))}
            </div>
          </section>
        )
      case 'goals':
        return topGoals.length > 0 ? (
          <section key="goals" className="mb-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold text-on-surface">Goals</h2><button onClick={() => setScreen('goals')} className="flex items-center gap-1 text-sm text-primary">See all <ArrowRight size={14} /></button></div>
            <div className="space-y-3">
              {topGoals.map((goal) => (
                <button key={goal.id} onClick={() => setScreen('goals')} className="w-full rounded-2xl bg-surface p-4 text-left border border-outline-variant card-lift">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3"><div className="rounded-full p-2" style={{ backgroundColor: `${goal.color}22` }}><PiggyBank size={18} style={{ color: goal.color }} /></div><div><p className="text-sm font-medium text-on-surface">{goal.name}</p><p className="text-xs text-on-surface-variant">{formatLKR(goal.current)} of {formatLKR(goal.target)}</p></div></div>
                    <span className="text-sm font-semibold" style={{ color: goal.color }}>{goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0}%</span>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full transition-all animate-progress-fill" style={{ width: `${goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0}%`, backgroundColor: goal.color }} /></div>
                </button>
              ))}
            </div>
          </section>
        ) : null
      case 'recentTransactions':
        return (
          <section key="recentTransactions" className="mb-6">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold text-on-surface">Recent Transactions</h2><button onClick={() => setScreen('transactions')} className="flex items-center gap-1 text-sm text-primary">See all <ArrowRight size={14} /></button></div>
            <div className="space-y-2">
              {recentTransactions.length > 0 ? recentTransactions.map((t) => <TransactionItem key={t.id} transaction={t} onClick={() => setScreen('transactions')} />) : <p className="py-8 text-center text-sm text-on-surface-variant">No transactions yet.</p>}
            </div>
          </section>
        )
      default:
        return null
    }
  }

  return (
    <div className="animate-fade-in px-4 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-surface">
            {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <User size={24} className="text-on-surface-variant" />}
          </div>
          <div><p className="text-sm text-on-surface-variant">{greeting}</p><h1 className="text-2xl font-bold text-on-surface">{auth.currentUser || 'Pocket Money'}</h1></div>
        </div>
        <div className="flex items-center gap-2">
          <UserSwitcher />
          <button onClick={() => setEditing(!editing)} className={`rounded-full p-2 ${editing ? 'bg-primary text-on-primary' : 'bg-surface text-on-surface-variant'}`}>
            <Layout size={20} />
          </button>
          <button onClick={() => setScreen('settings')} className="rounded-full bg-surface p-2 text-on-surface-variant"><Wallet size={20} /></button>
        </div>
      </header>

      {editing && (
        <div className="mb-4 rounded-2xl border border-primary bg-primary-container/10 p-4 animate-scale-in">
          <div className="mb-3 flex items-center gap-2"><Sparkles size={16} className="text-primary" /><p className="text-sm font-semibold text-primary">Customize Dashboard</p></div>
          <p className="mb-3 text-xs text-on-surface-variant">Toggle cards on/off. Use arrows to reorder.</p>
          <div className="space-y-2">
            {AVAILABLE_CARDS.map((card) => {
              const Icon = card.icon
              const active = cardOrder.includes(card.id)
              const idx = cardOrder.indexOf(card.id)
              return (
                <div key={card.id} className={`flex items-center gap-2 rounded-xl p-2.5 ${active ? 'bg-surface' : 'bg-surface-variant/50'}`}>
                  <button onClick={() => toggleCard(card.id)} className={`flex h-5 w-5 items-center justify-center rounded-md border ${active ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant'}`}>
                    {active && '✓'}
                  </button>
                  <Icon size={16} className={active ? 'text-on-surface' : 'text-on-surface-variant'} />
                  <span className={`flex-1 text-sm ${active ? 'text-on-surface' : 'text-on-surface-variant'}`}>{card.name}</span>
                  {active && (
                    <div className="flex gap-1">
                      <button onClick={() => moveCard(card.id, -1)} disabled={idx === 0} className="rounded p-1 text-on-surface-variant disabled:opacity-30">↑</button>
                      <button onClick={() => moveCard(card.id, 1)} disabled={idx === cardOrder.length - 1} className="rounded p-1 text-on-surface-variant disabled:opacity-30">↓</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <button onClick={() => setEditing(false)} className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-on-primary">Done</button>
        </div>
      )}

      <div className="stagger-children">
        <DashboardTipCard setScreen={setScreen} onOpenDiscover={() => setDiscoverOpen(true)} />
        {cardOrder.map((cardId) => renderCard(cardId))}
      </div>

      {discoverOpen && (
        <TipsDiscover onClose={() => setDiscoverOpen(false)} setScreen={setScreen} />
      )}
    </div>
  )
}