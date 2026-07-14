import { Plus } from 'lucide-react'
import { useModalCount } from '../contexts/ModalContext'
import { useQuickAddAction } from '../contexts/QuickAddContext'

export default function QuickAddButton() {
  const modalCount = useModalCount()
  const action = useQuickAddAction()
  if (modalCount > 0 || !action) return null
  return (
    <button
      onClick={action}
           className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-xl shadow-primary/30 transition-transform active:scale-95"
      aria-label="Add"
    >
      <Plus size={28} strokeWidth={2.5} />
    </button>
  )
}
