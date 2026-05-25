import { useMemo, useState } from 'react'
import { Eye, Filter, Search } from 'lucide-react'
import { conversasMock, conversasTotalResultados, type StatusConversa } from '../data/mockData'

const statusOptions: (StatusConversa | 'Todos')[] = [
  'Todos',
  'Ativo',
  'Pendente',
  'Resolvido',
  'Atenção',
]

const assuntoOptions = ['Todos', 'Reclamação', 'Dúvida', 'Agendamento', 'Outros']

function statusBadgeClass(s: StatusConversa) {
  switch (s) {
    case 'Ativo':
      return 'bg-sky-100 text-sky-800'
    case 'Pendente':
      return 'bg-slate-100 text-slate-700'
    case 'Resolvido':
      return 'bg-emerald-100 text-emerald-800'
    case 'Atenção':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export function ConversasPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<(typeof statusOptions)[number]>('Todos')
  const [assunto, setAssunto] = useState('Todos')

  const rows = useMemo(() => {
    return conversasMock.filter((r) => {
      if (status !== 'Todos' && r.status !== status) return false
      if (assunto !== 'Todos' && r.assunto !== assunto) return false
      if (q.trim()) {
        const hay = `${r.nome} ${r.identificador}`.toLowerCase()
        if (!hay.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [q, status, assunto])

  return (
    <div className="flex flex-1 flex-col gap-4 pb-4">
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm lg:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, CPF ou protocolo..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as (typeof statusOptions)[number])}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700"
            >
              {statusOptions.map((o) => (
                <option key={o} value={o}>
                  Status: {o}
                </option>
              ))}
            </select>
            <select
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700"
            >
              {assuntoOptions.map((o) => (
                <option key={o} value={o}>
                  Assunto: {o}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-[#0D1B4B]"
            >
              <Filter className="size-4" />
              Filtros
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Última Mensagem</th>
                <th className="px-4 py-3">Data/Hora</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0D1B4B] text-xs font-bold text-white">
                        {r.iniciais}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{r.nome}</p>
                        <p className="truncate text-xs text-slate-500">{r.identificador}</p>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-xs px-4 py-4">
                    <p className="line-clamp-2 text-slate-700">{r.ultimaMensagem}</p>
                    <p className="mt-1 text-xs font-medium text-[#2563EB]">
                      Assunto: {r.assunto}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                    {r.dataHoraLabel}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={[
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        statusBadgeClass(r.status),
                      ].join(' ')}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      className="inline-flex rounded-lg p-2 text-[#2563EB] hover:bg-sky-50"
                      aria-label="Ver detalhes"
                    >
                      <Eye className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Mostrando <span className="font-semibold text-slate-800">1</span> a{' '}
            <span className="font-semibold text-slate-800">{rows.length}</span> de{' '}
            <span className="font-semibold text-slate-800">{conversasTotalResultados}</span>{' '}
            resultados
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500"
              disabled
            >
              Anterior
            </button>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB] text-xs font-bold text-white">
              1
            </span>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
