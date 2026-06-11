import { useMemo, useState, type ReactNode } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { PageHeader } from './PageHeader'
import { AppFooter } from './AppFooter'
import { useLayoutShell } from '../hooks/useLayoutShell'
import type { HeaderRefreshAction, MainLayoutOutletContext } from '../hooks/useMainLayoutOutlet'

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/conversas': 'Conversas',
  '/agendamentos': 'Agendamentos',
  '/usuarios': 'Usuários',
  '/mensagens-nao-entendidas': 'Mensagens não entendidas',
  '/base-de-conhecimento': 'Base de Conhecimento',
  '/relatorios': 'Relatórios',
  '/configuracoes': 'Configurações',
}

export function Layout() {
  const { pathname } = useLocation()
  const { sidebarOpen, setSidebarOpen, toggleSidebar } = useLayoutShell()
  const title = titles[pathname] ?? 'Painel'
  const [headerExtra, setHeaderExtra] = useState<ReactNode>(null)
  const [headerRefresh, setHeaderRefresh] = useState<HeaderRefreshAction>(null)

  const outletCtx = useMemo<MainLayoutOutletContext>(
    () => ({ setHeaderExtra, setHeaderRefresh }),
    [setHeaderExtra, setHeaderRefresh],
  )

  return (
    <div className="flex min-h-full bg-[#f4f6fb]">
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          aria-label="Fechar menu lateral"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div
        className={[
          'fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-out lg:static lg:z-0 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <Sidebar />
      </div>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-0">
        <PageHeader
          title={title}
          onMenuClick={toggleSidebar}
          extraActions={headerExtra}
          onRefresh={headerRefresh?.onRefresh}
          isRefreshing={headerRefresh?.isRefreshing}
        />
        <main className="flex flex-1 flex-col px-4 pb-4 pt-2 lg:px-8">
          <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col">
            <Outlet context={outletCtx} />
          </div>
        </main>
        <AppFooter />
      </div>
    </div>
  )
}
