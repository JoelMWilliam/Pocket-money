import { useState, useEffect, useRef } from 'react'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatLKR, formatShortDate } from '../lib/utils'
import { Receipt, Split, Tag } from 'lucide-react'
import { getIcon } from '../lib/icons'

export default function TransactionItem({ transaction, onClick, onDelete }) {
  const { accounts, categories } = useAppStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const account = accounts.find((a) => a.id === transaction.accountId)
  const category = categories.find((c) => c.id === transaction.categoryId)

  const Icon = category?.icon ? getIcon(category.icon) : getIcon('CircleDollarSign')

  const isIncome = transaction.type === 'income'
  const isExpense = transaction.type === 'expense'
  const isTransfer = transaction.type === 'transfer'

  let amountClass = 'text-on-surface'
  if (isIncome) amountClass = 'text-primary'
  if (isExpense) amountClass = 'text-on-surface'
  if (isTransfer) amountClass = 'text-on-surface-variant'

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [menuOpen])

  return (
    <div className="relative">
      <div className="flex w-full items-stretch rounded-2xl bg-surface text-left border border-outline-variant active:bg-surface-bright">
        <button
          onClick={onClick}
          className="flex min-w-0 flex-1 items-center justify-between rounded-l-2xl p-3 text-left transition-colors"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className="shrink-0 rounded-xl p-2.5"
              style={{
                backgroundColor: isTransfer
                  ? 'var(--md-sys-color-surface-variant)'
                  : `${category?.color || '#8e8e93'}22`
              }}
            >
              <Icon
                size={20}
                style={{
                  color: isTransfer ? '#8e8e93' : category?.color || '#8e8e93'
                }}
              />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-on-surface">
                {transaction.note || category?.name || 'Transaction'}
              </p>
              <p className="truncate text-xs text-on-surface-variant">
                {formatShortDate(transaction.date)} · {account?.name || 'Unknown'}
              </p>
              {transaction.tags?.length > 0 && (
                <div className="mt-0.5 flex items-center gap-1 overflow-hidden">
                  {transaction.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="inline-flex shrink-0 items-center gap-0.5 text-[10px] text-on-surface-variant">
                      <Tag size={8} /> <span className="max-w-[60px] truncate">{tag}</span>
                    </span>
                  ))}
                  {transaction.tags.length > 2 && (
                    <span className="text-[10px] text-on-surface-variant">+{transaction.tags.length - 2}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <p className={`ml-2 shrink-0 text-sm font-semibold ${amountClass}`}>
            {isIncome ? '+' : isTransfer ? '⇄' : '-'} {formatLKR(transaction.amount)}
          </p>
        </button>
        <button
          type="button"
          aria-label="More actions"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
          className="flex items-center justify-center rounded-r-2xl px-3 text-on-surface-variant hover:bg-surface-bright"
        >
          <MoreVertical size={16} />
        </button>
      </div>

      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-2 top-14 z-50 w-36 rounded-2xl bg-surface p-2 shadow-xl border border-outline-variant"
          style={{ transform: 'translateZ(0)' }}
        >
          <button
            onClick={() => { setMenuOpen(false); onClick() }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-bright"
          >
            <Pencil size={14} /> Edit
          </button>
          {onDelete && (
            <button
              onClick={() => { setMenuOpen(false); onDelete() }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-error hover:bg-error/10"
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
