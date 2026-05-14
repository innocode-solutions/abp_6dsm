import { useContext } from 'react'
import { LayoutShellContext } from '../context/layout-shell-context'

export function useLayoutShell() {
  const ctx = useContext(LayoutShellContext)
  if (!ctx) throw new Error('useLayoutShell must be used within LayoutShellProvider')
  return ctx
}
