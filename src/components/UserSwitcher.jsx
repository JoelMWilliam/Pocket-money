import { useState, useRef, useEffect } from 'react'
import { User, X, Shield } from 'lucide-react'
import { RegisterModal } from './ModalRoot'
import { useAppStore } from '../store/useAppStore'

export default function UserSwitcher() {
  const { auth, switchUser } = useAppStore()
  const [open, setOpen] = useState(false)
  const current = auth.currentUser
  const users = Object.keys(auth.users)

  const handleSwitch = (username) => {
    if (username === current) {
      setOpen(false)
      return
    }
    setOpen(false)
    switchUser(username)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-primary"
        aria-label="Switch user"
      >
        {current ? (
          <span className="text-sm font-bold uppercase">{current.slice(0, 2)}</span>
        ) : (
          <User size={18} />
        )}
      </button>

      {open && (
        <>
          <RegisterModal />
          <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-surface p-5 border-t border-outline-variant">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-on-surface">Switch user</h2>
              <button onClick={() => setOpen(false)} className="rounded-full p-2 text-on-surface-variant">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {users.map((username) => {
                const isCurrent = username === current
                return (
                  <button
                    key={username}
                    onClick={() => handleSwitch(username)}
                    className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors ${
                      isCurrent ? 'border-primary bg-primary-container' : 'border-outline-variant bg-black'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isCurrent ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface'}`}>
                        <span className="text-sm font-bold uppercase">{username.slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${isCurrent ? 'text-primary' : 'text-on-surface'}`}>{username}</p>
                        {isCurrent && <p className="text-xs text-primary">Active</p>}
                      </div>
                    </div>
                    {!isCurrent && <Shield size={16} className="text-on-surface-variant" />}
                  </button>
                )
              })}
            </div>

            <p className="mt-4 text-center text-xs text-on-surface-variant">
              Selecting another user will lock the app. Re-enter your PIN or biometric to continue.
            </p>
          </div>
          </div>
        </>
      )}
    </>
  )
}
