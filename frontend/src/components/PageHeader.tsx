import type { ReactNode } from 'react'
import { Calendar, Menu, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { REFERENCE_DATE } from '../data/mockData'

type PageHeaderProps = {
  title: string
  onMenuClick: () => void
  extraActions?: ReactNode
}

export function PageHeader({ title, onMenuClick, extraActions }: PageHeaderProps) {
  const dataLabel = format(REFERENCE_DATE, "dd/MM/yyyy", { locale: ptBR })

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
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm"
        >
          <Calendar className="size-4 text-[#0D1B4B]" aria-hidden />
          <span>{dataLabel}</span>
          <span className="text-slate-400">▾</span>
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-[#0D1B4B] shadow-sm"
        >
          <RefreshCw className="size-4" aria-hidden />
          Atualizar
        </button>
      </div>
    </header>
  )
}
