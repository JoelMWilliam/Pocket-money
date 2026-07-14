import { createContext, useContext, useState, useRef, useLayoutEffect, useCallback, useMemo } from 'react'

const QuickAddContext = createContext({
  register: () => () => {},
  action: null
})

export function QuickAddProvider({ children }) {
  const [activeAction, setActiveAction] = useState(null)
  const actionsRef = useRef([])

  const register = useCallback((action) => {
    actionsRef.current.push(action)
    setActiveAction(() => action)
    return () => {
      actionsRef.current = actionsRef.current.filter((a) => a !== action)
      const last = actionsRef.current[actionsRef.current.length - 1] || null
      setActiveAction(() => last)
    }
  }, [])

  const value = useMemo(() => ({ register, action: activeAction }), [register, activeAction])

  return (
    <QuickAddContext.Provider value={value}>
      {children}
    </QuickAddContext.Provider>
  )
}

export function useRegisterQuickAdd(action) {
  const { register } = useContext(QuickAddContext)
  const actionRef = useRef(action)
  actionRef.current = action

  useLayoutEffect(() => {
    const stable = () => actionRef.current()
    return register(stable)
  }, [register])
}

export function useQuickAddAction() {
  return useContext(QuickAddContext).action
}
