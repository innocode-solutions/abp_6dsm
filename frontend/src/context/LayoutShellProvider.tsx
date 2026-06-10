import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { LayoutShellContext } from './layout-shell-context'

export function LayoutShellProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((o) => !o)
  }, [])

  const value = useMemo(
    () => ({ sidebarOpen, setSidebarOpen, toggleSidebar }),
    [sidebarOpen, toggleSidebar],
  )

  return (
    <LayoutShellContext.Provider value={value}>
      {children}
    </LayoutShellContext.Provider>
  )
}
