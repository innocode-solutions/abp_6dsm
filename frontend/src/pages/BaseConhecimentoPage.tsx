import { BookOpen, FileText, Plus } from 'lucide-react'
import { baseConhecimentoMock } from '../data/mockData'

export function BaseConhecimentoPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#0D1B4B]">Artigos e trechos</h2>
          <p className="text-sm text-slate-500">
            Conteúdo usado pelo bot nas respostas — tudo mockado para demonstração.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600"
        >
          <Plus className="size-4" />
          Novo artigo
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        {baseConhecimentoMock.map((k) => (
          <article
            key={k.id}
            className="flex flex-col rounded-xl border border-slate-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-[#2563EB]">
                <BookOpen className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {k.categoria}
                </p>
                <h3 className="mt-1 text-sm font-semibold text-[#0D1B4B]">{k.titulo}</h3>
                <p className="mt-2 text-xs text-slate-500">
                  Atualizado em {k.atualizadoEm} · {k.trechos} trechos indexados
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <FileText className="size-3.5" />
                Ver conteúdo
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Editar
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
