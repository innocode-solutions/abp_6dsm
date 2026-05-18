import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
  Calendar,
  HelpCircle,
  MessageCircle,
  MessageSquare,
  Users,
} from 'lucide-react'
import {
  agendamentosStackedPorDia,
  assuntosDonut,
  atendimentosPorDia,
  dashboardMetricas,
} from '../data/mockData'

const metricIcons: Record<string, typeof MessageCircle> = {
  conversas: MessageCircle,
  usuarios: Users,
  mensagens: MessageSquare,
  agendamentos: Calendar,
  naoEntendidas: HelpCircle,
}

export function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 pb-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {dashboardMetricas.map((m) => {
          const Icon = metricIcons[m.id] ?? MessageCircle
          const danger = m.id === 'naoEntendidas'
          return (
            <article
              key={m.id}
              className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-500">{m.titulo}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-[#0D1B4B]">
                    {m.valor}
                  </p>
                  <p
                    className={[
                      'mt-1 text-xs font-semibold',
                      m.tendenciaPositiva ? 'text-emerald-600' : 'text-[#CC2229]',
                    ].join(' ')}
                  >
                    {m.tendencia}
                  </p>
                </div>
                <div
                  className={[
                    'flex h-11 w-11 items-center justify-center rounded-xl',
                    danger ? 'bg-red-50 text-[#CC2229]' : 'bg-blue-50 text-[#2563EB]',
                  ].join(' ')}
                >
                  <Icon className="size-5" aria-hidden />
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ChartCard
          title="Atendimentos por dia"
          action={
            <select className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 outline-none">
              <option>Últimos 7 dias</option>
            </select>
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={atendimentosPorDia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis domain={[0, 300]} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                }}
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
        </ChartCard>

        <ChartCard title="Assuntos mais buscados">
          <div className="flex flex-col items-stretch gap-4 lg:flex-row">
            <div className="flex flex-1 justify-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={assuntosDonut}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={68}
                    outerRadius={96}
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
            <ul className="flex flex-col justify-center gap-2 text-xs lg:w-[42%]">
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
        </ChartCard>

        <ChartCard
          title="Agendamentos por dia / status"
          action={
            <select className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 outline-none">
              <option>Últimos 7 dias</option>
            </select>
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={agendamentosStackedPorDia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="confirmados" name="Confirmados" stackId="s" fill="#0D1B4B" />
              <Bar dataKey="pendentes" name="Pendentes" stackId="s" fill="#EAB308" />
              <Bar dataKey="cancelados" name="Cancelados" stackId="s" fill="#CC2229" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

function ChartCard({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="flex flex-col rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[#0D1B4B]">{title}</h2>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </section>
  )
}
