import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingUp, Wallet, CreditCard, Landmark, Gem, Home, Car, ArrowRightLeft } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatLKR } from '../lib/utils'
import { getIcon } from '../lib/icons'

const ASSET_ICONS = {
  cash: Wallet,
  bank: Landmark,
  investment: TrendingUp,
  retirement: Landmark,
  realestate: Home,
  vehicle: Car,
  gold: Gem,
  other: Wallet
}

export default function NetWorth() {
  const { accounts, debts, investments, loans } = useAppStore()
  const [selectedType, setSelectedType] = useState(null)

  const assetAccounts = accounts.filter((a) => a.type !== 'credit')
  const liabilityAccounts = accounts.filter((a) => a.type === 'credit')

  const investmentValue = investments.reduce((sum, i) => sum + (i.currentPrice || 0) * (i.units || 1), 0)
  const lentValue = loans.filter((l) => l.type === 'lent').reduce((sum, l) => sum + (l.amount - (l.repaid || 0)), 0)
  const borrowedValue = loans.filter((l) => l.type === 'borrowed').reduce((sum, l) => sum + (l.amount - (l.repaid || 0)), 0)

  const assetsByType = useMemo(() => {
    const groups = {}
    assetAccounts.forEach((a) => {
      const type = a.type
      if (!groups[type]) groups[type] = { type, value: 0, accounts: [] }
      groups[type].value += a.balance
      groups[type].accounts.push(a)
    })
    if (investmentValue > 0) {
      groups['investment'] = { type: 'investment', value: investmentValue, accounts: [] }
    }
    if (lentValue > 0) {
      groups['loans'] = { type: 'loans', value: lentValue, accounts: [] }
    }
    return Object.values(groups)
  }, [assetAccounts, investmentValue, lentValue])

  const totalAssets = assetAccounts.reduce((sum, a) => sum + a.balance, 0) + investmentValue + lentValue
  const totalLiabilities = [...liabilityAccounts, ...debts].reduce((sum, a) => sum + (a.balance || 0), 0) + borrowedValue
  const netWorth = totalAssets - totalLiabilities

  const chartData = assetsByType.map((g) => ({
    name: g.type[0].toUpperCase() + g.type.slice(1),
    value: g.value,
    color: g.accounts[0]?.color || '#8e8e93'
  }))

  const displayedAccounts = selectedType
    ? assetAccounts.filter((a) => a.type === selectedType)
    : assetAccounts

  return (
    <div className="animate-fade-in px-4 pt-6">
      <header className="mb-6">
        <p className="text-sm text-on-surface-variant">Wealth overview</p>
        <h1 className="text-2xl font-bold text-on-surface">Net Worth</h1>
      </header>

      <section className="mb-5 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 p-6 border border-outline-variant">
        <p className="text-sm font-medium text-on-surface-variant">Net Worth</p>
        <p className={`mt-1 text-4xl font-bold tracking-tight ${netWorth >= 0 ? 'text-on-surface' : 'text-error'}`}>
          {formatLKR(netWorth)}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-surface-variant p-3">
            <p className="text-[10px] text-on-surface-variant">Assets</p>
            <p className="text-sm font-semibold text-on-surface">{formatLKR(totalAssets)}</p>
          </div>
          <div className="rounded-2xl bg-surface-variant p-3">
            <p className="text-[10px] text-on-surface-variant">Liabilities</p>
            <p className="text-sm font-semibold text-on-surface">{formatLKR(totalLiabilities)}</p>
          </div>
        </div>
      </section>

      {chartData.length > 0 && (
        <section className="mb-5 rounded-2xl bg-surface p-4 border border-outline-variant">
          <h2 className="mb-2 text-base font-semibold text-on-surface">Asset Allocation</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  stroke="none"
                  onClick={(_, index) => {
                    const type = assetsByType[index]?.type
                    setSelectedType(selectedType === type ? null : type)
                  }}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0a0a',
                    border: '1px solid #38383a',
                    borderRadius: '12px',
                    color: '#e3e3e3'
                  }}
                  formatter={(value) => formatLKR(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {chartData.map((item, idx) => (
              <button
                key={item.name}
                onClick={() => {
                  const type = assetsByType[idx]?.type
                  setSelectedType(selectedType === type ? null : type)
                }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${
                  selectedType === assetsByType[idx]?.type
                    ? 'bg-primary-container text-primary'
                    : 'bg-surface text-on-surface-variant'
                }`}
              >
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mb-24">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-on-surface">{selectedType ? 'Filtered Accounts' : 'All Accounts'}</h2>
          {selectedType && (
            <button onClick={() => setSelectedType(null)} className="text-xs text-primary">Clear filter</button>
          )}
        </div>
        <div className="space-y-3">
          {selectedType === 'investment' && investments.map((inv) => {
            const value = (inv.currentPrice || 0) * (inv.units || 1)
            const Icon = TrendingUp
            return (
              <div key={inv.id} className="flex items-center justify-between rounded-2xl bg-surface p-4 border border-outline-variant">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl p-2 bg-primary-container/30">
                    <Icon size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-on-surface">{inv.name}</p>
                    <p className="text-xs text-on-surface-variant capitalize">{inv.type}</p>
                  </div>
                </div>
                <p className="text-base font-semibold text-on-surface">{formatLKR(value)}</p>
              </div>
            )
          })}
          {selectedType === 'loans' && loans.filter((l) => l.type === 'lent').map((loan) => {
            const value = loan.amount - (loan.repaid || 0)
            const Icon = ArrowRightLeft
            return (
              <div key={loan.id} className="flex items-center justify-between rounded-2xl bg-surface p-4 border border-outline-variant">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl p-2 bg-green-400/20">
                    <Icon size={20} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-on-surface">{loan.name}</p>
                    <p className="text-xs text-on-surface-variant">Lent</p>
                  </div>
                </div>
                <p className="text-base font-semibold text-on-surface">{formatLKR(value)}</p>
              </div>
            )
          })}
          {displayedAccounts.filter((a) => selectedType !== 'investment' && selectedType !== 'loans').map((account) => {
            const Icon = getIcon(account.icon, Wallet)
            return (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-2xl bg-surface p-4 border border-outline-variant"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl p-2" style={{ backgroundColor: `${account.color}22` }}>
                    <Icon size={20} style={{ color: account.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-on-surface">{account.name}</p>
                    <p className="text-xs text-on-surface-variant capitalize">{account.type}</p>
                  </div>
                </div>
                <p className="text-base font-semibold text-on-surface">{formatLKR(account.balance)}</p>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
