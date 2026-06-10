import type { ReactNode } from 'react'
import { Calendar, Menu, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type PageHeaderProps = {
  title: string
  onMenuClick: () => void
  extraActions?: ReactNode
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function PageHeader({
  title,
  onMenuClick,
  extraActions,
  onRefresh,
  isRefreshing = false,
}: PageHeaderProps) {
  const dataLabel = format(new Date(), 'dd/MM/yyyy', { locale: ptBR })

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-[#f4f6fb]/95 px-4 py-4 backdrop-blur lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#0D1B4B] shadow-sm lg:hidden"
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </button>
        <h1 className="truncate text-xl font-bold tracking-tight text-[#0D1B4B] lg:text-2xl">
          {title}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {extraActions}
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
          <Calendar className="size-4 text-[#0D1B4B]" aria-hidden />
          <span>{dataLabel}</span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={!onRefresh || isRefreshing}
          className={[
            'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-[#0D1B4B] shadow-sm transition',
            !onRefresh || isRefreshing ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-50',
          ].join(' ')}
        >
          <RefreshCw
            className={['size-4', isRefreshing ? 'animate-spin' : ''].join(' ')}
            aria-hidden
          />
          {isRefreshing ? 'Atualizando' : 'Atualizar'}
        </button>
      </div>
    </header>
  )
}
