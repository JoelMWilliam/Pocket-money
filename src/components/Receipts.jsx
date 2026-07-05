import { useState } from 'react'
import { X, Receipt, Trash2, ArrowRight } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatLKR, formatShortDate } from '../lib/utils'
import ReceiptImage from './ReceiptImage'

export default function Receipts({ setScreen }) {
  const { transactions, accounts, categories, updateTransaction } = useAppStore()
  const [selected, setSelected] = useState(null)

  const withReceipts = transactions.filter((t) => t.receipt)

  const handleDelete = (txId) => {
    if (!confirm('Remove this receipt photo?')) return
    updateTransaction(txId, { receipt: null })
    if (selected?.id === txId) setSelected(null)
  }

  return (
    <div className="animate-fade-in px-4 pt-6">
      <header className="mb-6">
        <p className="text-sm text-on-surface-variant">Attached photos</p>
        <h1 className="text-2xl font-bold text-on-surface">Receipts</h1>
      </header>

      {withReceipts.length === 0 ? (
        <div className="py-16 text-center">
          <Receipt size={48} className="mx-auto mb-3 text-on-surface-variant" />
          <p className="text-sm text-on-surface-variant">No receipts yet.</p>
          <button
            onClick={() => setScreen('transactions')}
            className="mt-3 text-sm text-primary"
          >
            Add one to a transaction
          </button>
        </div>
      ) : (
        <section className="grid grid-cols-2 gap-3">
          {withReceipts.map((t) => {
            const account = accounts.find((a) => a.id === t.accountId)
            const category = categories.find((c) => c.id === t.categoryId)
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className="relative overflow-hidden rounded-2xl bg-surface aspect-square border border-outline-variant"
              >
                <ReceiptImage
                  src={t.receipt}
                  alt="Receipt"
                  className="h-full w-full object-cover opacity-80"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 text-left">
                  <p className="text-xs font-medium text-white">{formatLKR(t.amount)}</p>
                  <p className="text-[10px] text-white/70">{formatShortDate(t.date)}</p>
                </div>
              </button>
            )
          })}
        </section>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4">
          <button
            onClick={() => setSelected(null)}
            className="absolute right-4 top-4 rounded-full bg-surface p-2 text-on-surface"
          >
            <X size={24} />
          </button>

          <div className="w-full max-w-md">
            <ReceiptImage
              src={selected.receipt}
              alt="Receipt"
              className="mb-4 w-full rounded-2xl"
            />
            <div className="rounded-2xl bg-surface p-4 border border-outline-variant">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface">{selected.note || 'Transaction'}</p>
                  <p className="text-xs text-on-surface-variant">{formatShortDate(selected.date)} · {accounts.find((a) => a.id === selected.accountId)?.name}</p>
                </div>
                <p className="text-sm font-semibold text-on-surface">{formatLKR(selected.amount)}</p>
              </div>
              <button
                onClick={() => handleDelete(selected.id)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-error/20 py-3 text-sm font-semibold text-error"
              >
                <Trash2 size={16} /> Remove Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
