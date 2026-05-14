import { Download, Info, Search } from 'lucide-react'
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  assuntosDonut,
  mensagensNaoEntendidasDetalhe,
  mensagensNaoEntendidasTotal,
  relatorioDesempenhoAtendimentos,
} from '../data/mockData'

export function RelatoriosPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 pb-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between lg:p-5">
        <div className="flex flex-wrap gap-2">
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700">
            <option>Todos os Canais</option>
            <option>WhatsApp</option>
            <option>Web</option>
          </select>
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700">
            <option>Todos os Assuntos</option>
            <option>Reclamação</option>
            <option>Produtos</option>
          </select>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0D1B4B] shadow-sm hover:bg-slate-50 lg:self-auto"
        >
          <Download className="size-4" />
          Exportar Relatório
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-[#0D1B4B]">
              Desempenho de Atendimentos
              <Info className="size-3.5 text-slate-400" aria-hidden />
            </h2>
            <select className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 outline-none">
              <option>Últimos 7 dias</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={relatorioDesempenhoAtendimentos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis domain={[0, 300]} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
              />
              <Line
                type="monotone"
                dataKey="atendimentos"
                name="Atendimentos"
                stroke="#0D1B4B"
                strokeWidth={2}
                dot={{ r: 4, fill: '#0D1B4B', strokeWidth: 2, stroke: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#0D1B4B]">Assuntos mais buscados</h2>
            <Info className="size-3.5 text-slate-400" aria-hidden />
          </div>
          <div className="flex flex-col items-stretch gap-4 lg:flex-row">
            <div className="flex flex-1 justify-center">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={assuntosDonut}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {assuntosDonut.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => {
                      const n = typeof value === 'number' ? value : Number(value)
                      return [`${Number.isFinite(n) ? n : 0}%`, '']
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex flex-col justify-center gap-2 text-xs lg:w-[40%]">
              {assuntosDonut.map((s) => (
                <li key={s.name} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.name}
                  </span>
                  <span className="font-semibold text-slate-800">{s.value}%</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm lg:p-6">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-[#0D1B4B]">
            Detalhamento: Mensagens não entendidas
          </h2>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Buscar mensagem..."
              className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Data/Hora</th>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Mensagem Original</th>
                <th className="px-4 py-3">Intenção Sugerida</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {mensagensNaoEntendidasDetalhe.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="whitespace-nowrap px-4 py-4 text-slate-600">{r.dataHora}</td>
                  <td className="px-4 py-4 font-medium text-slate-900">{r.usuario}</td>
                  <td className="max-w-md px-4 py-4 text-slate-700">{r.mensagem}</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      {r.intencao} ({r.confianca}%)
                    </span>
                  </td>
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

        <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Mostrando <span className="font-semibold">1</span>-
            <span className="font-semibold">3</span> de{' '}
            <span className="font-semibold">{mensagensNaoEntendidasTotal}</span> registros
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Anterior
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Próxima
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
