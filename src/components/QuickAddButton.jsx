import { Plus } from 'lucide-react'
import { useModalCount } from '../contexts/ModalContext'
import { useQuickAddAction } from '../contexts/QuickAddContext'
import { hapticTap } from '../lib/haptics'

export default function QuickAddButton() {
  const modalCount = useModalCount()
  const action = useQuickAddAction()
  if (modalCount > 0 || !action) return null
  return (
    <button
      onClick={() => { hapticTap(); action() }}
      className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-2xl shadow-primary/40 ring-1 ring-primary/30 transition-transform active:scale-90 hover:scale-105"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
      aria-label="Add transaction"
    >
      <Plus size={28} strokeWidth={2.5} />
    </button>
  )
}