import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const ModalContext = createContext({
  count: 0,
  registerModal: () => () => {}
})

export function ModalProvider({ children }) {
  const [count, setCount] = useState(0)
  const registerModal = useCallback(() => {
    setCount((c) => c + 1)
    return () => setCount((c) => Math.max(0, c - 1))
  }, [])
  return (
    <ModalContext.Provider value={{ count, registerModal }}>
      {children}
    </ModalContext.Provider>
  )
}

export function useModalCount() {
  return useContext(ModalContext).count
}

export function useRegisterModal() {
  const { registerModal } = useContext(ModalContext)
  useEffect(() => registerModal(), [registerModal])
}
