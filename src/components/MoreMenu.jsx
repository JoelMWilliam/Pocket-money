import { BarChart3, TrendingDown, Calendar, Scale, Settings, X, LayoutTemplate, FileSpreadsheet, ShieldCheck, BarChart4, TrendingUp, ArrowRightLeft, Receipt, MessageSquare, Target, Wallet, Tag, Bot } from 'lucide-react'

import { useRegisterModal } from '../contexts/ModalContext'

const MORE_ITEMS = [
  { id: 'goals', label: 'Goals', icon: Target, desc: 'Savings goals' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, desc: 'Spending insights' },
  { id: 'cashflow', label: 'Cash Flow', icon: Wallet, desc: 'Forecast view' },
  { id: 'advancedreports', label: 'Reports', icon: BarChart4, desc: 'Advanced reports' },
  { id: 'networth', label: 'Net Worth', icon: Scale, desc: 'Assets & liabilities' },
  { id: 'investments', label: 'Investments', icon: TrendingUp, desc: 'Stocks, EPF & more' },
  { id: 'loans', label: 'Loans', icon: ArrowRightLeft, desc: 'Money lent/borrowed' },
  { id: 'debts', label: 'Debts', icon: TrendingDown, desc: 'Payoff planner' },
  { id: 'recurring', label: 'Recurring', icon: Calendar, desc: 'Bills & income' },
  { id: 'receipts', label: 'Receipts', icon: Receipt, desc: 'Receipt gallery' },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate, desc: 'Quick transactions' },
  { id: 'rules', label: 'Rules', icon: ShieldCheck, desc: 'Auto-categorize' },
  { id: 'categories', label: 'Categories', icon: Tag, desc: 'Manage tags' },
  { id: 'import', label: 'Import', icon: FileSpreadsheet, desc: 'CSV import' },
  { id: 'assistant', label: 'Assistant', icon: Bot, desc: 'AI wealth assistant' },
  { id: 'sms', label: 'SMS', icon: MessageSquare, desc: 'Import from SMS', isAction: true },
  { id: 'settings', label: 'Settings', icon: Settings, desc: 'Preferences' }
]

export default function MoreMenu({ current, onChange, onClose, onAction }) {
  useRegisterModal()
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex w-full max-w-md max-h-[80vh] flex-col animate-slide-up rounded-t-3xl bg-surface border-t border-outline-variant">
        <div className="flex-none p-4 pb-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-on-surface">More</h2>
            <button onClick={onClose} className="rounded-full p-2 text-on-surface-variant">
              <X size={20} />
            </button>
          </div>
          <div className="mx-auto mb-1 h-1 w-12 rounded-full bg-outline-variant" />
        </div>
        <div className="overflow-y-auto p-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            {MORE_ITEMS.map((item) => {
              const Icon = item.icon
              const active = current === item.id
              return (
                <button
                  key={item.id}
                  aria-label={`${item.label} — ${item.desc}`}
                  onClick={() => {
                    if (item.isAction) {
                      onAction?.(item.id)
                    } else {
                      onChange(item.id)
                    }
                    onClose()
                  }}
                  className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-colors ${
                    active
                      ? 'border-primary bg-primary-container'
                      : 'border-outline-variant bg-surface'
                  }`}
                >
                  <Icon size={22} className={active ? 'text-primary' : 'text-on-surface-variant'} />
                  <div>
                    <p className={`text-sm font-semibold ${active ? 'text-primary' : 'text-on-surface'}`}>{item.label}</p>
                    <p className="text-[10px] text-on-surface-variant">{item.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
