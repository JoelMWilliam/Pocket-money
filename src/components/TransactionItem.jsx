import { useState, useEffect, useRef } from 'react'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatLKR, formatShortDate } from '../lib/utils'
import { Receipt, Split, Tag } from 'lucide-react'
import * as LucideIcons from 'lucide-react'

export default function TransactionItem({ transaction, onClick, onDelete }) {
  const { accounts, categories } = useAppStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const account = accounts.find((a) => a.id === transaction.accountId)
  const category = categories.find((c) => c.id === transaction.categoryId)

  const Icon = category?.icon
    ? LucideIcons[category.icon] || LucideIcons.CircleDollarSign
    : LucideIcons.CircleDollarSign

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
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between rounded-2xl bg-surface p-3 text-left transition-colors border border-outline-variant active:bg-surface-bright"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="rounded-xl p-2.5 shrink-0"
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
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-on-surface">
              {transaction.note || category?.name || 'Transaction'}
            </p>
            <p className="text-xs text-on-surface-variant">
              {formatShortDate(transaction.date)} · {account?.name || 'Unknown'}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {transaction.receipt && (
                <span className="inline-flex items-center gap-1 text-[10px] text-primary">
                  <Receipt size={10} /> receipt
                </span>
              )}
              {transaction.splits?.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] text-primary">
                  <Split size={10} /> split
                </span>
              )}
              {transaction.tags?.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 text-[10px] text-on-surface-variant">
                  <Tag size={10} /> {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <p className={`text-sm font-semibold ${amountClass}`}>
            {isIncome ? '+' : isTransfer ? '⇄' : '-'} {formatLKR(transaction.amount)}
          </p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
            className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-bright"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </button>

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
