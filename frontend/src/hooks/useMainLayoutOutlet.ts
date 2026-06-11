import type { ReactNode } from 'react'
import { useOutletContext } from 'react-router-dom'

export type HeaderRefreshAction = {
  onRefresh: () => void
  isRefreshing?: boolean
} | null

export type MainLayoutOutletContext = {
  setHeaderExtra: (node: ReactNode | null) => void
  setHeaderRefresh: (action: HeaderRefreshAction) => void
}

export function useMainLayoutOutlet() {
  const ctx = useOutletContext<MainLayoutOutletContext>()
  if (!ctx) {
    throw new Error('useMainLayoutOutlet deve ser usado nas rotas internas do Layout.')
  }
  return ctx
}
