import { useState, useEffect } from 'react'
import { useAppStore, registerActivityListeners } from './store/useAppStore'
import { useTheme } from './hooks/useTheme'
import BottomNav from './components/BottomNav'
import AuthScreen from './components/AuthScreen'
import LockScreen from './components/LockScreen'
import Onboarding from './components/Onboarding'
import Dashboard from './components/Dashboard'
import Accounts from './components/Accounts'
import Transactions from './components/Transactions'
import Budgets from './components/Budgets'
import Goals from './components/Goals'
import Analytics from './components/Analytics'
import Settings from './components/Settings'
import Debts from './components/Debts'
import Recurring from './components/Recurring'
import NetWorth from './components/NetWorth'
import Investments from './components/Investments'
import Loans from './components/Loans'
import Receipts from './components/Receipts'
import QuickAddButton from './components/QuickAddButton'
import AddTransaction from './components/AddTransaction'

import Templates from './components/Templates'
import Rules from './components/Rules'
import ImportCSV from './components/ImportCSV'
import AdvancedReports from './components/AdvancedReports'
import CashFlow from './components/CashFlow'

const SCREENS = {
  dashboard: Dashboard,
  accounts: Accounts,
  transactions: Transactions,
  budgets: Budgets,
  goals: Goals,
  analytics: Analytics,
  advancedreports: AdvancedReports,
  cashflow: CashFlow,
  debts: Debts,
  recurring: Recurring,
  networth: NetWorth,
  investments: Investments,
  loans: Loans,
  receipts: Receipts,
  templates: Templates,
  rules: Rules,
  import: ImportCSV,
  settings: Settings
}

export default function App() {
  const [screen, setScreen] = useState('dashboard')
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const currentUser = useAppStore((state) => state.auth.currentUser)
  const isLocked = useAppStore((state) => state.auth.isLocked)
  const users = useAppStore((state) => Object.keys(state.auth.users))
  const seedColor = useAppStore((state) => state.settings.seedColor)
  const isDark = useAppStore((state) => state.settings.isDark)

  useEffect(() => {
    registerActivityListeners()
  }, [])

  useEffect(() => {
    if (currentUser) setScreen('dashboard')
  }, [currentUser])

  useTheme(seedColor, isDark)

  // Auth flow
  if (!currentUser) {
    if (users.length === 0) {
      return <Onboarding />
    }
    return <AuthScreen />
  }

  if (isLocked) {
    return <LockScreen />
  }

  const ScreenComponent = SCREENS[screen]
  const showQuickAdd = ['dashboard', 'accounts', 'transactions', 'budgets', 'goals', 'analytics', 'cashflow', 'networth', 'debts', 'recurring', 'investments', 'loans', 'receipts'].includes(screen)

  return (
    <div className="relative flex h-[100dvh] flex-col bg-black">
      <div className="scroll-container flex-1 no-scrollbar safe-top pb-28" style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}>
        <ScreenComponent setScreen={setScreen} />
      </div>
      {showQuickAdd && <QuickAddButton onClick={() => setQuickAddOpen(true)} />}
      <BottomNav current={screen} onChange={setScreen} />
      {quickAddOpen && <AddTransaction onClose={() => setQuickAddOpen(false)} />}
    </div>
  )
}
