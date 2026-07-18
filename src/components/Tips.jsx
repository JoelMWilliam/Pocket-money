import { useState, useMemo, useRef, useEffect } from 'react'
import { Sparkles, X, ChevronRight, ChevronLeft, Lightbulb, Wand2, ArrowRight, ArrowLeft } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { hapticSelect, hapticTap } from '../lib/haptics'

/**
 * Tips & feature highlights.
 *
 * Tips surface on the Dashboard as a small, dismissible card pointing at
 * underutilized features. A separate "Discover" flow opens a fullscreen
 * pager that walks through all available tips.
 *
 * Dismissed tips are persisted in settings.dismissedTips (array of ids).
 * A tip re-shows if its `id` is not in dismissedTips.
 */

const ALL_TIPS = [
  {
    id: 'sms-import',
    icon: 'MessageSquare',
    title: 'Auto-import bank SMS',
    body: 'Pocket Money can turn your bank SMS alerts into transactions automatically. Tap More → SMS to import.',
    ctaLabel: 'Open SMS import',
    ctaScreen: 'transactions',
    applies: (state) => state.transactions.length < 5 && state.accounts.length > 0,
    highlight: 'sms'
  },
  {
    id: 'budgets',
    icon: 'PiggyBank',
    title: 'Set a monthly budget',
    body: 'Tap Budgets to set monthly limits per category. We\'ll track your progress and warn you when you\'re close to the limit.',
    ctaLabel: 'Set a budget',
    ctaScreen: 'budgets',
    applies: (state) => state.budgets.length === 0,
    highlight: 'budgets'
  },
  {
    id: 'goals',
    icon: 'Target',
    title: 'Create a savings goal',
    body: 'Goals help you save toward something specific. Tap More → Goals to add one and watch your progress fill up.',
    ctaLabel: 'Add a goal',
    ctaScreen: 'goals',
    applies: (state) => state.goals.length === 0,
    highlight: 'goals'
  },
  {
    id: 'reconcile',
    icon: 'Scale',
    title: 'Reconcile with statements',
    body: 'Open any account and tap Reconcile to match your app balance with a bank statement PDF. We\'ll highlight the difference.',
    ctaLabel: 'View accounts',
    ctaScreen: 'accounts',
    applies: (state) => state.accounts.length > 0 && state.accounts.some((a) => a.reconciledBalance === undefined),
    highlight: 'accounts'
  },
  {
    id: 'analytics',
    icon: 'BarChart3',
    title: 'Understand your spending',
    body: 'Analytics shows trends, month-over-month changes, and category breakdowns to help you spot where your money goes.',
    ctaLabel: 'Open Analytics',
    ctaScreen: 'analytics',
    applies: (state) => state.transactions.length > 3,
    highlight: 'analytics'
  },
  {
    id: 'receipts',
    icon: 'Receipt',
    title: 'Scan receipts',
    body: 'When you add a transaction, tap the receipt icon to scan a receipt with OCR — amount and merchant are parsed for you.',
    ctaLabel: 'Open receipts',
    ctaScreen: 'receipts',
    applies: () => true,
    highlight: 'receipts'
  },
  {
    id: 'assistant',
    icon: 'Bot',
    title: 'Ask the AI assistant',
    body: 'The assistant answers questions about your finances in plain English — "How much did I spend on food last month?"',
    ctaLabel: 'Open Assistant',
    ctaScreen: 'assistant',
    applies: (state) => state.transactions.length > 0,
    highlight: 'assistant'
  },
  {
    id: 'rules',
    icon: 'ShieldCheck',
    title: 'Auto-categorize with rules',
    body: 'Rules let you say: any SMS from "UBER" should always be filed under Transport. Set once, forget forever.',
    ctaLabel: 'Manage rules',
    ctaScreen: 'rules',
    applies: (state) => state.rules.length === 0 && state.transactions.length > 5,
    highlight: 'rules'
  },
  {
    id: 'lock-biometric',
    icon: 'Fingerprint',
    title: 'Unlock with biometrics',
    body: 'Enable fingerprint or Face Unlock in Settings so you don\'t have to type your PIN every time.',
    ctaLabel: 'Open Settings',
    ctaScreen: 'settings',
    applies: () => true,
    highlight: 'settings'
  },
  {
    id: 'google-backup',
    icon: 'Cloud',
    title: 'Back up to Google Drive',
    body: 'Never lose your data. Sign in with Google once and Pocket Money backs up automatically every day.',
    ctaLabel: 'Open Settings',
    ctaScreen: 'settings',
    applies: (state) => !state.settings?.googleDriveBackupEnabled,
    highlight: 'settings'
  },
  {
    id: 'recurring',
    icon: 'Calendar',
    title: 'Track recurring bills',
    body: 'Add salary, rent, subscriptions, and loan payments as recurring. We\'ll remind you before they\'re due.',
    ctaLabel: 'Add recurring',
    ctaScreen: 'recurring',
    applies: (state) => state.recurring.length === 0,
    highlight: 'recurring'
  },
  {
    id: 'templates',
    icon: 'LayoutTemplate',
    title: 'Save transaction templates',
    body: 'For transactions you log often (like a daily coffee), save a template and create them in one tap.',
    ctaLabel: 'View templates',
    ctaScreen: 'templates',
    applies: (state) => state.transactions.length > 10 && state.templates.length === 0,
    highlight: 'templates'
  }
]

export function getTipsForState(state, dismissed = []) {
  const dismissedSet = new Set(dismissed || [])
  // Defensive: test mocks and fresh users may not have every collection. Pad
  // missing fields so tip.applies() never throws.
  const safeState = {
    transactions: [],
    accounts: [],
    budgets: [],
    goals: [],
    recurring: [],
    rules: [],
    templates: [],
    debts: [],
    investments: [],
    loans: [],
    settings: {},
    ...(state || {})
  }
  return ALL_TIPS.filter((tip) => {
    try {
      return tip.applies(safeState) && !dismissedSet.has(tip.id)
    } catch (e) {
      return false
    }
  })
}

export function getUndiscoveredTips(state, dismissed = []) {
  // Tips not yet dismissed and not yet exercised (we infer from app use).
  return getTipsForState(state, dismissed)
}

// Inline dashboard tip card — single contextual tip users can dismiss or act on.
export function DashboardTipCard({ onOpenDiscover, setScreen }) {
  const state = useAppStore()
  const dismissed = state.settings?.dismissedTips || []
  const tips = useMemo(() => getTipsForState(state, dismissed), [state.transactions, state.accounts, state.budgets, state.goals, state.recurring, state.rules, state.templates, state.settings, dismissed])

  const [index, setIndex] = useState(0)
  const current = tips[index] || tips[0]

  useEffect(() => { if (index >= tips.length) setIndex(0) }, [tips.length, index])

  if (!current) return null

  const dismiss = (id) => {
    hapticTap()
    const updated = Array.from(new Set([...(state.settings?.dismissedTips || []), id]))
    state.updateSettings({ dismissedTips: updated, lastTipSeenAt: Date.now() })
  }

  const act = (tip) => {
    hapticSelect()
    if (tip.ctaScreen && setScreen) setScreen(tip.ctaScreen)
    dismiss(tip.id)
  }

  const next = () => { hapticSelect(); setIndex((i) => (i + 1) % tips.length) }
  const prev = () => { hapticSelect(); setIndex((i) => (i - 1 + tips.length) % tips.length) }

  return (
    <section className="mb-5 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary-container/40 to-primary/5 p-5 card-lift relative overflow-hidden">
      <div className="absolute right-3 top-3 flex items-center gap-1">
        {tips.length > 1 && (
          <>
            <button onClick={prev} aria-label="Previous tip" className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface/50">
              <ChevronLeft size={16} />
            </button>
            <button onClick={next} aria-label="Next tip" className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface/50">
              <ChevronRight size={16} />
            </button>
          </>
        )}
        <button onClick={() => dismiss(current.id)} aria-label="Dismiss tip" className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface/50">
          <X size={16} />
        </button>
      </div>
      <div className="flex items-start gap-3 pr-10">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/40">
          <Lightbulb size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-on-surface">{current.title}</h3>
            {tips.length > 1 && (
              <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-on-surface-variant">
                {index + 1}/{tips.length}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">{current.body}</p>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => act(current)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-on-primary transition-transform active:scale-95"
            >
              {current.ctaLabel}
              <ArrowRight size={14} />
            </button>
            <button
              onClick={onOpenDiscover}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary"
            >
              <Sparkles size={14} /> See all tips
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

// Full-screen discover pager — walks through every applicable tip.
export function TipsDiscover({ onClose, setScreen }) {
  const state = useAppStore()
  const dismissed = state.settings?.dismissedTips || []
  const allTips = useMemo(() => ALL_TIPS.filter((t) => t.applies(state)), [state])
  const [idx, setIdx] = useState(0)
  const tipsRef = useRef(null)

  useEffect(() => { hapticSelect() }, [idx])

  const tip = allTips[idx]
  const isLast = idx === allTips.length - 1

  const dismissAll = () => {
    state.updateSettings({
      dismissedTips: Array.from(new Set([...(state.settings?.dismissedTips || []), ...allTips.map((t) => t.id)])),
      lastTipSeenAt: Date.now()
    })
    onClose()
  }

  const start = (tip) => {
    hapticSelect()
    if (tip.ctaScreen && setScreen) setScreen(tip.ctaScreen)
    state.updateSettings({
      dismissedTips: Array.from(new Set([...(state.settings?.dismissedTips || []), tip.id]))
    })
    onClose()
  }

  if (!tip) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-surface px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container">
            <Sparkles size={28} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-on-surface">You're all caught up</h2>
          <p className="mt-2 text-sm text-on-surface-variant">No more tips right now. Check back later as your usage grows.</p>
          <button onClick={onClose} className="mt-6 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary">Done</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-surface safe-top">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <button onClick={onClose} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-variant">
          <X size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Wand2 size={14} className="text-primary" />
          <span className="text-sm font-medium text-on-surface-variant">Discover · {idx + 1}/{allTips.length}</span>
        </div>
        <button onClick={dismissAll} className="text-xs font-medium text-on-surface-variant">Skip all</button>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 pb-2">
        {allTips.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? 'w-6 bg-primary' : 'w-1.5 bg-surface-variant'}`}
          />
        ))}
      </div>

      <div ref={tipsRef} key={tip.id} className="animate-fade-in flex flex-1 flex-col justify-center px-6 py-6">
        <div className="mx-auto w-full max-w-sm">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-primary-container shadow-2xl shadow-primary/20">
            <TipIcon name={tip.icon} />
          </div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-on-surface">{tip.title}</h2>
          <p className="mt-4 text-center text-base leading-relaxed text-on-surface-variant">{tip.body}</p>

          {tip.visual && (
            <div className="mt-6 rounded-3xl border border-outline-variant bg-surface p-4">
              {tip.visual}
            </div>
          )}
        </div>
      </div>

      <div className="flex-none px-6 pb-8 pt-4 safe-bottom">
        <div className="mx-auto flex max-w-sm flex-col gap-3">
          <button
            onClick={() => start(tip)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-on-primary transition-transform active:scale-95"
          >
            {tip.ctaLabel}
            <ArrowRight size={18} />
          </button>
          {!isLast ? (
            <button
              onClick={() => setIdx((i) => i + 1)}
              className="flex w-full items-center justify-center gap-1 text-sm font-medium text-on-surface-variant"
            >
              Next tip <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex w-full items-center justify-center gap-1 text-sm font-medium text-on-surface-variant"
            >
              <ArrowLeft size={14} /> Back to the app
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function TipIcon({ name }) {
  // Lazy import to avoid pulling all icons eagerly.
  const [Icon, setIcon] = useState(null)
  useEffect(() => {
    let cancelled = false
    import('lucide-react').then((mod) => {
      if (cancelled) return
      setIcon(mod[name] || mod.Lightbulb)
    }).catch(() => setIcon(null))
    return () => { cancelled = true }
  }, [name])
  if (!Icon) return <Lightbulb size={36} className="text-primary" />
  return <Icon size={36} className="text-primary" />
}

export default DashboardTipCard