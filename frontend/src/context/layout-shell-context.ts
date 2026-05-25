import { createContext } from 'react'

export type LayoutShellValue = {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const LayoutShellContext = createContext<LayoutShellValue | null>(null)
