import type { ReactNode, ChangeEvent } from 'react'
import { Calendar, Menu, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useHeader } from '../context/HeaderContext'

type PageHeaderProps = {
  title: string
  onMenuClick: () => void
  extraActions?: ReactNode
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function PageHeader({ title, onMenuClick, extraActions, onRefresh, isRefreshing }: PageHeaderProps) {
  // 1. Trazemos de volta o dispararAtualizacao
  const { dataSelecionada, setDataSelecionada, dispararAtualizacao } = useHeader()
  
  // 2. Trazemos de volta a proteção contra o "Invalid time value"
  const dataSegura = dataSelecionada instanceof Date && !isNaN(dataSelecionada.getTime()) 
    ? dataSelecionada 
    : new Date()

  const dataLabel = format(dataSegura, "dd/MM/yyyy", { locale: ptBR })

  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value && setDataSelecionada) {
      setDataSelecionada(new Date(e.target.value + 'T12:00:00'))
    }
  }

  // 3. Função inteligente que junta a lógica da develop com a sua
  const handleRefreshClick = () => {
    if (onRefresh) {
      onRefresh() // Se a página passar uma função específica, usa ela
    } else if (dispararAtualizacao) {
      dispararAtualizacao() // Se não, usa a atualização global do contexto
    }
  }

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-[#f4f6fb]/95 px-4 py-4 backdrop-blur lg:px-8">
      {/* ... (Div do título e botão de menu permanecem iguais) ... */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#0D1B4B] shadow-sm lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="size-5" />
        </button>
        <h1 className="truncate text-xl font-bold tracking-tight text-[#0D1B4B] lg:text-2xl">
          {title}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {extraActions}
        
        <div className="relative inline-flex">
          <input 
            type="date" 
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            onChange={handleDateChange}
            value={format(dataSegura, 'yyyy-MM-dd')}
          />
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm pointer-events-none"
          >
            <Calendar className="size-4 text-[#0D1B4B]" aria-hidden />
            <span>{dataLabel}</span>
            <span className="text-slate-400">▾</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleRefreshClick}
          // Tiramos o !onRefresh daqui para o botão não ficar desativado nas páginas
          // que usam o contexto global. Ele só desativa se estiver carregando.
          disabled={isRefreshing}
          className={[
            'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-[#0D1B4B] shadow-sm transition',
            isRefreshing ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-50',
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