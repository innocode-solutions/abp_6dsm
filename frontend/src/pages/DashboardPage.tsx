import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
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
import { useAuth } from '../hooks/useAuth'
import { api } from '../services/api'

const metricIcons: Record<string, typeof MessageCircle> = {
  conversas: MessageCircle,
  usuarios: Users,
  mensagens: MessageSquare,
  agendamentos: Calendar,
  naoEntendidas: HelpCircle,
}

export function DashboardPage() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [appointments, setAppointments] = useState<any[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [kpiData, setKpiData] = useState<any>(null)

  useEffect(() => {
    if (!token) return

    async function loadDashboard() {
      try {
        setLoading(true)
        setError(null)
        
        // 1. Fetch appointments (all slots)
        const agendaRes = await api.getAgenda(token!)
        const agenda = agendaRes.dados || []
        setAppointments(agenda)

        // 2. Fetch conversations to count unique WhatsApp contacts
        const convRes = await api.getConversas(token!)
        const convs = convRes.dados || []
        setConversations(convs)

        // 3. Fetch operators to fetch general KPI counts
        const funcRes = await api.getFuncionarios(token!)
        const funcs = funcRes.dados || []
        const userIds = funcs.map((f: any) => f._id || f.id)

        if (userIds.length > 0) {
          const kpi = await api.getKpiDashboard(token!, userIds)
          setKpiData(kpi)
        }
      } catch (err: any) {
        setError(err.message || 'Falha ao carregar painel')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [token])

  // Generate last 7 days of labels and ISO prefixes
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return {
        isoDate: `${year}-${month}-${day}`,
        label: `${day}/${month}`,
      }
    })
  }, [])

  // Calculate atendimentosPorDia from appointments
  const atendimentosPorDia = useMemo(() => {
    return last7Days.map((day) => {
      const count = appointments.filter((a) => {
        if (!a.inicio_em) return false
        const aDate = new Date(a.inicio_em).toISOString().split('T')[0]
        return aDate === day.isoDate
      }).length
      return {
        dia: day.label,
        atendimentos: count,
      }
    })
  }, [appointments, last7Days])

  // Calculate agendamentosStackedPorDia from appointments
  const agendamentosStackedPorDia = useMemo(() => {
    return last7Days.map((day) => {
      const dayApps = appointments.filter((a) => {
        if (!a.inicio_em) return false
        const aDate = new Date(a.inicio_em).toISOString().split('T')[0]
        return aDate === day.isoDate
      })
      const confirmados = dayApps.filter((a) =>
        ['confirmado', 'check_in_realizado', 'em_atendimento', 'concluido'].includes(a.status)
      ).length
      const pendentes = dayApps.filter((a) => a.status === 'pendente').length
      const cancelados = dayApps.filter((a) => ['cancelado', 'expirado'].includes(a.status)).length

      return {
        dia: day.label,
        confirmados,
        pendentes,
        cancelados,
      }
    })
  }, [appointments, last7Days])

  // Calculate assuntosDonut from appointments
  const assuntosDonut = useMemo(() => {
    const counts: Record<string, number> = {}
    appointments.forEach((a) => {
      const name = a.servico_id?.nome || 'Geral'
      counts[name] = (counts[name] || 0) + 1
    })
    const total = appointments.length || 1
    const entries = Object.entries(counts)
    if (entries.length === 0) {
      return [{ name: 'Sem atendimentos', value: 100, color: '#9CA3AF' }]
    }
    const colors = ['#0D1B4B', '#CC2229', '#2563EB', '#93C5FD', '#9CA3AF']
    return entries.map(([name, count], index) => ({
      name,
      value: Math.round((count / total) * 100),
      color: colors[index % colors.length],
    }))
  }, [appointments])

  // Compute metrics cards
  const metrics = useMemo(() => {
    const futureCount = appointments.filter((a) => new Date(a.inicio_em) > new Date()).length
    const totalMsgs = kpiData?.totalMessages || 0
    const totalUsers = conversations.length || 0

    return [
      {
        id: 'conversas',
        titulo: 'Conversas totais',
        valor: String(totalUsers),
        tendencia: 'Ativas no WhatsApp',
        tendenciaPositiva: true,
      },
      {
        id: 'usuarios',
        titulo: 'Usuários únicos',
        valor: String(totalUsers),
        tendencia: 'Histórico acumulado',
        tendenciaPositiva: true,
      },
      {
        id: 'mensagens',
        titulo: 'Mensagens trocadas',
        valor: String(totalMsgs),
        tendencia: 'Bot & Operadores',
        tendenciaPositiva: true,
      },
      {
        id: 'agendamentos',
        titulo: 'Agendamentos futuros',
        valor: String(futureCount),
        tendencia: 'Confirmados/Pendentes',
        tendenciaPositiva: true,
      },
      {
        id: 'naoEntendidas',
        titulo: 'Última atualização',
        valor: kpiData?.lastUpdated ? new Date(kpiData.lastUpdated).toLocaleTimeString('pt-BR') : 'Sem dados',
        tendencia: 'Sincronizado da API',
        tendenciaPositiva: false,
      },
    ]
  }, [appointments, conversations, kpiData])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0D1B4B] border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-[#CC2229] font-medium bg-red-50 border border-red-100 rounded-xl">
        {error}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 pb-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((m) => {
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
                      m.tendenciaPositiva ? 'text-emerald-600' : 'text-slate-500',
                    ].join(' ')}
                  >
                    {m.tendencia}
                  </p>
                </div>
                <div
                  className={[
                    'flex h-11 w-11 items-center justify-center rounded-xl',
                    danger ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-[#2563EB]',
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
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
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
              <ResponsiveContainer width="100%" height={280}>
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
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
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
