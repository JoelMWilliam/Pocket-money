import { useState, useEffect, useRef } from 'react'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
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
import ReceiptScanner from './components/ReceiptScanner'

import Categories from './components/Categories'
import Templates from './components/Templates'
import Rules from './components/Rules'
import ImportCSV from './components/ImportCSV'
import AdvancedReports from './components/AdvancedReports'
import CashFlow from './components/CashFlow'
import Assistant from './components/Assistant'
import DailyReport from './components/DailyReport'
import { maybeAutoImportSms } from './lib/sms'
import { isGoogleDriveConfigured, initializeGoogleAuth } from './lib/googleDrive'

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
  categories: Categories,
  assistant: Assistant,
  dailyreport: DailyReport,
  settings: Settings
}

const HOME_SCREEN = 'dashboard'

export default function App() {
  const [screen, setScreen] = useState(HOME_SCREEN)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [rehydrated, setRehydrated] = useState(false)
  const [exitConfirm, setExitConfirm] = useState(false)
  const historyRef = useRef([HOME_SCREEN])
  const currentUser = useAppStore((state) => state.auth.currentUser)
  const isLocked = useAppStore((state) => state.auth.isLocked)
  const users = useAppStore((state) => Object.keys(state.auth.users))
  const seedColor = useAppStore((state) => state.settings.seedColor)
  const isDark = useAppStore((state) => state.settings.isDark)
  const settings = useAppStore((state) => state.settings)
  const persistUserData = useAppStore((state) => state.persistUserData)

  useEffect(() => {
    registerActivityListeners()
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let removeListener = null
    CapApp.addListener('appUrlOpen', (event) => {
      if (event.url && event.url.includes('dailyreport')) {
        setScreen('dailyreport')
      }
    }).then((l) => { removeListener = l })
    return () => { if (removeListener) removeListener.remove() }
  }, [])

  useEffect(() => {
    if (isGoogleDriveConfigured()) {
      initializeGoogleAuth().catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Google auth init failed:', err)
      })
    }
  }, [])

  // Track rehydration so we don't flash onboarding while the store loads.
  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => {
      setRehydrated(true)
    })
    if (useAppStore.persist.hasHydrated?.()) {
      setRehydrated(true)
    }
    return unsub
  }, [])

  useEffect(() => {
    if (currentUser) setScreen(HOME_SCREEN)
  }, [currentUser])

  // Sync screen changes to navigation history.
  useEffect(() => {
    const history = historyRef.current
    if (history[history.length - 1] !== screen) {
      history.push(screen)
      if (history.length > 20) history.shift()
    }
  }, [screen])

  useTheme(seedColor, isDark)

  // Reset exit confirmation when leaving the dashboard.
  useEffect(() => {
    if (screen !== HOME_SCREEN && exitConfirm) {
      setExitConfirm(false)
    }
  }, [screen, exitConfirm])

  // Android back-button / gesture handling.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let removeListener = null
    let exitTimer = null

    const handleBack = async () => {
      // 1. Close any open modal / quick-add first.
      if (quickAddOpen) {
        setQuickAddOpen(false)
        return
      }

      // 2. If we are inside a secondary screen, navigate back.
      if (screen !== HOME_SCREEN) {
        const history = historyRef.current
        history.pop() // remove current
        const previous = history[history.length - 1] || HOME_SCREEN
        setScreen(previous)
        return
      }

      // 3. On dashboard: confirm once before exiting.
      if (exitConfirm) {
        await flushAndExit()
        return
      }
      setExitConfirm(true)
      exitTimer = setTimeout(() => setExitConfirm(false), 2000)
    }

    const flushAndExit = async () => {
      try {
        await persistUserData()
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Flush on exit failed', e)
      }
      CapApp.exitApp()
    }

    CapApp.addListener('backButton', handleBack).then((listener) => {
      removeListener = listener
    })

    return () => {
      if (removeListener) removeListener.remove()
      if (exitTimer) clearTimeout(exitTimer)
    }
  }, [screen, quickAddOpen, exitConfirm, persistUserData])

  // Flush data when the app goes to background so it survives a quick kill.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let removePause = null
    CapApp.addListener('pause', async () => {
      try {
        await persistUserData()
        await useAppStore.getState().maybeAutoBackupToGoogleDrive()
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Pause flush/backup failed', e)
      }
    }).then((listener) => {
      removePause = listener
    })
    return () => {
      if (removePause) removePause.remove()
    }
  }, [persistUserData])

  // Auto-import bank SMS when the app comes to the foreground.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let removeResume = null

    const runAutoImport = async () => {
      try {
        const state = useAppStore.getState()
        if (!state.auth.currentUser) return
        await maybeAutoImportSms(state)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Auto SMS import failed', e)
      }
    }

    CapApp.addListener('resume', runAutoImport).then((listener) => {
      removeResume = listener
    })

    runAutoImport()

    return () => {
      if (removeResume) removeResume.remove()
    }
  }, [])

  if (!rehydrated) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  // Auth flow
  if (!settings.onboardingComplete) {
    return <Onboarding onComplete={() => setRehydrated(true)} />
  }

  if (!currentUser) {
    if (users.length === 0) {
      return <Onboarding onComplete={() => setRehydrated(true)} />
    }
    return <AuthScreen />
  }

  if (isLocked) {
    return <LockScreen />
  }

  const ScreenComponent = SCREENS[screen]

  return (
    <div className="relative flex h-[100dvh] flex-col bg-surface">
      <div className="scroll-container flex-1 no-scrollbar safe-top pb-28" style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}>
        <ScreenComponent setScreen={setScreen} onAddTransaction={() => setQuickAddOpen(true)} />
      </div>
      <QuickAddButton />
      <BottomNav current={screen} onChange={setScreen} />
      {quickAddOpen && <AddTransaction onClose={() => setQuickAddOpen(false)} />}
      {receiptOpen && <ReceiptScanner onClose={() => setReceiptOpen(false)} />}
      {exitConfirm && (
        <div className="pointer-events-none fixed bottom-24 left-0 right-0 z-50 flex justify-center">
          <div className="rounded-full bg-surface px-4 py-2 text-xs text-on-surface shadow-lg">
            Press back again to exit
          </div>
        </div>
      )}
    </div>
  )
}
