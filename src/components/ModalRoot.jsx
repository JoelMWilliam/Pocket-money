import { useRegisterModal as useRegisterModalBase } from '../contexts/ModalContext'

export default function ModalRoot({ children }) {
  useRegisterModalBase()
  return children
}

export function RegisterModal() {
  useRegisterModalBase()
  return null
}

export function useRegisterModal() {
  return useRegisterModalBase()
}
