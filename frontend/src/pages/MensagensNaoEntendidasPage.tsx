import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { mensagensInboxMock } from '../data/mockData'

export function MensagensNaoEntendidasPage() {
  const [q, setQ] = useState('')
  const rows = useMemo(() => {
    if (!q.trim()) return mensagensInboxMock
    return mensagensInboxMock.filter((m) =>
      `${m.usuario} ${m.preview}`.toLowerCase().includes(q.toLowerCase()),
    )
  }, [q])

  return (
    <div className="flex flex-1 flex-col gap-4 pb-4">
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#0D1B4B]">Fila de revisão</h2>
            <p className="text-sm text-slate-500">
              Mensagens com baixa confiança ou fora do escopo — priorize o treinamento da IA.
            </p>
          </div>
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar usuário ou trecho..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
            />
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Data/Hora</th>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Canal</th>
                <th className="px-4 py-3">Mensagem</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/60">
                  <td className="whitespace-nowrap px-4 py-4 text-slate-600">{m.dataHora}</td>
                  <td className="px-4 py-4 font-medium text-slate-900">{m.usuario}</td>
                  <td className="px-4 py-4 text-slate-600">{m.canal}</td>
                  <td className="max-w-md px-4 py-4 text-slate-700">{m.preview}</td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      className="text-sm font-semibold text-[#2563EB] hover:underline"
                    >
                      Treinar IA
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
