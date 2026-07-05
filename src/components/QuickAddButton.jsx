import { Plus } from 'lucide-react'

export default function QuickAddButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-xl shadow-primary/30 transition-transform active:scale-95"
      aria-label="Add transaction"
    >
      <Plus size={28} strokeWidth={2.5} />
    </button>
  )
}
