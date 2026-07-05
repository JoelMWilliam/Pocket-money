import { useEffect } from 'react'
import { applyThemeToDocument } from '../lib/theme'

export function useTheme(seedColor, isDark) {
  useEffect(() => {
    applyThemeToDocument(seedColor, isDark)
  }, [seedColor, isDark])
}
