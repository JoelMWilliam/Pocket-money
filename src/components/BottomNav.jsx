import { useState } from 'react'
import { Home, Wallet2, ArrowLeftRight, PiggyBank, LayoutGrid } from 'lucide-react'
import MoreMenu from './MoreMenu'
import SmsParser from './SmsParser'

const ITEMS = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'accounts', label: 'Accounts', icon: Wallet2 },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'budgets', label: 'Budgets', icon: PiggyBank },
  { id: 'more', label: 'More', icon: LayoutGrid }
]

export default function BottomNav({ current, onChange }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [smsOpen, setSmsOpen] = useState(false)
  const isMoreOpen = ['analytics', 'advancedreports', 'debts', 'recurring', 'networth', 'investments', 'loans', 'receipts', 'templates', 'rules', 'import', 'settings', 'sms'].includes(current)

  const handleMoreAction = (id) => {
    if (id === 'sms') {
      setSmsOpen(true)
    }
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant bg-black/90 backdrop-blur-md safe-bottom">
        <div className="mx-auto flex max-w-md items-center justify-around px-2 pb-safe">
          {ITEMS.map((item) => {
            const Icon = item.icon
            const active = current === item.id || (item.id === 'more' && isMoreOpen)
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'more') {
                    setMoreOpen(true)
                  } else {
                    onChange(item.id)
                  }
                }}
                className={`flex flex-col items-center justify-center py-3 px-3 transition-colors ${
                  active ? 'text-primary' : 'text-on-surface-variant'
                }`}
                aria-label={item.label}
              >
                <div
                  className={`rounded-2xl p-2 transition-all ${
                    active ? 'bg-primary-container' : ''
                  }`}
                >
                  <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span className={`mt-1 text-[10px] font-medium ${active ? 'text-primary' : ''}`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
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
