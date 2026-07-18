import { useState, useRef, useEffect } from 'react'
import { Home, Wallet2, ArrowLeftRight, PiggyBank, LayoutGrid } from 'lucide-react'
import MoreMenu from './MoreMenu'
import SmsParser from './SmsParser'
import { hapticSelect } from '../lib/haptics'

import { useModalCount } from '../contexts/ModalContext'

const ITEMS = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'accounts', label: 'Accounts', icon: Wallet2 },
  { id: 'transactions', label: 'Activity', icon: ArrowLeftRight },
  { id: 'budgets', label: 'Budgets', icon: PiggyBank },
  { id: 'more', label: 'More', icon: LayoutGrid }
]

export default function BottomNav({ current, onChange }) {
  const modalCount = useModalCount()
  const hideNav = modalCount > 0
  const [moreOpen, setMoreOpen] = useState(false)
  const [smsOpen, setSmsOpen] = useState(false)
  const isMoreOpen = ['analytics', 'advancedreports', 'debts', 'recurring', 'networth', 'investments', 'loans', 'receipts', 'templates', 'rules', 'categories', 'import', 'assistant', 'settings'].includes(current)

  // Track active index for animated indicator slide.
  const activeIndex = ITEMS.findIndex((item) =>
    item.id === current || (item.id === 'more' && isMoreOpen)
  )
  const indicatorRef = useRef(null)
  const itemsRef = useRef([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Position the pill behind the active item.
    const indicator = indicatorRef.current
    const target = itemsRef.current[activeIndex]
    if (!indicator || !target) return
    const left = target.offsetLeft + target.offsetWidth * 0.18
    const right = target.offsetLeft + target.offsetWidth * 0.82
    indicator.style.left = `${left}px`
    indicator.style.width = `${right - left}px`
  }, [activeIndex, ready])

  const handleMoreAction = (id) => {
    if (id === 'sms') {
      setSmsOpen(true)
    }
  }

  return (
    <>
      <div
        className={`pointer-events-none fixed left-0 right-0 z-40 transition-all duration-300 ${hideNav ? 'opacity-0 translate-y-6' : 'opacity-100 translate-y-0'}`}
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        <div className="mx-auto w-full max-w-md px-4">
          <nav
            className="pointer-events-auto relative flex items-center justify-around rounded-full border border-outline-variant/70 bg-surface/85 px-2 py-2 shadow-2xl shadow-black/40 backdrop-blur-xl"
            ref={(node) => {
              if (node && !ready) setReady(true)
            }}
          >
            {/* Animated active pill */}
            <div
              ref={indicatorRef}
              className="pointer-events-none absolute top-2 bottom-2 rounded-full bg-primary-container/80 transition-all duration-300 ease-out"
              style={{ left: 0, width: 0 }}
            />
            {ITEMS.map((item, i) => {
              const Icon = item.icon
              const active = i === activeIndex
              return (
                <button
                  key={item.id}
                  ref={(el) => { itemsRef.current[i] = el }}
                  onClick={() => {
                    hapticSelect()
                    if (item.id === 'more') {
                      setMoreOpen(true)
                    } else {
                      onChange(item.id)
                    }
                  }}
                  className={`relative z-10 flex flex-1 flex-col items-center justify-center gap-1 rounded-full px-2 py-2 transition-colors duration-200 ${
                    active ? 'text-primary' : 'text-on-surface-variant'
                  }`}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.4 : 1.8}
                    className={`transition-transform duration-200 ${active ? 'scale-105' : ''}`}
                  />
                  <span
                    className={`text-[10px] font-medium leading-none tracking-tight transition-all duration-200 ${
                      active ? 'opacity-100' : 'opacity-60'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>
      {moreOpen && (
        <MoreMenu
          current={current}
          onChange={onChange}
          onClose={() => setMoreOpen(false)}
          onAction={handleMoreAction}
        />
      )}
      {smsOpen && <SmsParser onClose={() => setSmsOpen(false)} />}
    </>
  )
}