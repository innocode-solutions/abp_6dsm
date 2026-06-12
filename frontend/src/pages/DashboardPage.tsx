import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
  Clock3,
  MessageCircle,
  MessageSquare,
  Users,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useMainLayoutOutlet } from '../hooks/useMainLayoutOutlet'
import { api, type TopicKpiItem } from '../services/api'

type MetricId = 'conversas' | 'usuarios' | 'mensagens' | 'agendamentos' | 'atualizacao'

type DashboardMetric = {
  id: MetricId
  titulo: string
  valor: string
  tendencia: string
  tendenciaPositiva: boolean
}

type ApiAppointment = {
  _id?: string
  id?: string
  inicio_em?: string | Date
  fim_em?: string | Date
  status?: string
  assunto?: string
  descricao?: string
  servico_id?: {
    nome?: string
  } | string | null
}

type ApiConversation = {
  id?: string
  nome?: string
  identificador?: string
}

type KpiByUser = {
  userId: string
  count: number
}

type DashboardKpi = {
  totalMessages: number
  totalByUser: KpiByUser[]
  totalExtractions: number
  lastUpdated: string | null
}

type DayBucket = {
  isoDate: string
  label: string
}

const KPI_MAX_USERS_PER_REQUEST = 20
const KPI_MAX_USERS_QUERY_LENGTH = 200

const CONFIRMED_STATUSES = new Set([
  'confirmado',
  'check_in_realizado',
  'em_atendimento',
  'concluido',
])

const PENDING_STATUSES = new Set(['pendente', 'reagendado', 'remarcado'])
const CANCELED_STATUSES = new Set(['cancelado', 'expirado', 'nao_compareceu'])
const ACTIVE_FUTURE_STATUSES = new Set([
  'pendente',
  'confirmado',
  'check_in_realizado',
  'em_atendimento',
  'reagendado',
  'remarcado',
])

const TOPIC_COLORS = ['#0D1B4B', '#CC2229', '#2563EB', '#16A34A', '#9CA3AF']

const metricIcons: Record<MetricId, typeof MessageCircle> = {
  conversas: MessageCircle,
  usuarios: Users,
  mensagens: MessageSquare,
  agendamentos: Calendar,
  atualizacao: Clock3,
}

const numberFormatter = new Intl.NumberFormat('pt-BR')

function createEmptyKpi(): DashboardKpi {
  return {
    totalMessages: 0,
    totalByUser: [],
    totalExtractions: 0,
    lastUpdated: null,
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toDayLabel(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

function normalizeStatus(status: unknown): string {
  return isNonEmptyString(status) ? status.trim().toLowerCase() : ''
}

function getConversationId(conversation: ApiConversation): string | null {
  if (isNonEmptyString(conversation.id)) return conversation.id.trim()
  if (isNonEmptyString(conversation.identificador)) return conversation.identificador.trim()
  return null
}

function uniqueValues(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter(isNonEmptyString)))
}

function chunkKpiUserIds(userIds: string[]): string[][] {
  const chunks: string[][] = []
  let currentChunk: string[] = []
  let currentQueryLength = 0

  userIds.forEach((userId) => {
    const nextQueryLength =
      currentChunk.length === 0
        ? userId.length
        : currentQueryLength + 1 + userId.length
    const exceedsUserLimit = currentChunk.length >= KPI_MAX_USERS_PER_REQUEST
    const exceedsQueryLimit = nextQueryLength > KPI_MAX_USERS_QUERY_LENGTH

    if (currentChunk.length > 0 && (exceedsUserLimit || exceedsQueryLimit)) {
      chunks.push(currentChunk)
      currentChunk = [userId]
      currentQueryLength = userId.length
      return
    }

    currentChunk.push(userId)
    currentQueryLength = nextQueryLength
  })

  if (currentChunk.length > 0) {
    chunks.push(currentChunk)
  }

  return chunks
}

function normalizeKpi(raw: Partial<DashboardKpi> | null | undefined): DashboardKpi {
  if (!raw) return createEmptyKpi()

  return {
    totalMessages: Number(raw.totalMessages) || 0,
    totalByUser: Array.isArray(raw.totalByUser)
      ? raw.totalByUser.map((item) => ({
          userId: String(item.userId),
          count: Number(item.count) || 0,
        }))
      : [],
    totalExtractions: Number(raw.totalExtractions) || 0,
    lastUpdated: isNonEmptyString(raw.lastUpdated) ? raw.lastUpdated : null,
  }
}

function mergeKpis(results: DashboardKpi[]): DashboardKpi {
  if (results.length === 0) return createEmptyKpi()

  const totalByUser = results.flatMap((result) => result.totalByUser)
  const lastUpdated = results
    .map((result) => toDate(result.lastUpdated))
    .filter((date): date is Date => date !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0]

  return {
    totalMessages: results.reduce((sum, result) => sum + result.totalMessages, 0),
    totalByUser,
    totalExtractions: results.reduce((sum, result) => sum + result.totalExtractions, 0),
    lastUpdated: lastUpdated ? lastUpdated.toISOString() : null,
  }
}

function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

function formatLastUpdated(value: string | null): string {
  const date = toDate(value)

  if (!date) {
    return 'Sem dados'
  }

  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Falha ao carregar painel'
}

export function DashboardPage() {
  const { token } = useAuth()
  const { setHeaderRefresh } = useMainLayoutOutlet()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appointments, setAppointments] = useState<ApiAppointment[]>([])
  const [conversations, setConversations] = useState<ApiConversation[]>([])
  const [topics, setTopics] = useState<TopicKpiItem[]>([])
  const [kpiData, setKpiData] = useState<DashboardKpi>(() => createEmptyKpi())
  const [refreshRequest, setRefreshRequest] = useState(0)
  const [referenceDate, setReferenceDate] = useState(() => new Date())

  const refreshDashboard = useCallback(() => {
    setRefreshRequest((current) => current + 1)
  }, [])

  useEffect(() => {
    let active = true
    const authToken = token
    const isManualRefresh = refreshRequest > 0

    if (!authToken) {
      setLoading(false)
      setRefreshing(false)
      return () => {
        active = false
      }
    }

    async function loadDashboard(validToken: string) {
      try {
        if (isManualRefresh) {
          setRefreshing(true)
        } else {
          setLoading(true)
        }
        setError(null)

        const [agendaRes, conversasRes, assuntosRes] = await Promise.all([
          api.getAgenda(validToken),
          api.getConversas(validToken),
          api.getAssuntosDashboard(validToken),
        ])

        const agenda = Array.isArray(agendaRes.dados) ? agendaRes.dados : []
        const conversas = Array.isArray(conversasRes.dados) ? conversasRes.dados : []
        const assuntos = Array.isArray(assuntosRes.dados) ? assuntosRes.dados : []
        const conversationIds = uniqueValues(conversas.map(getConversationId))
        const kpiBatches = chunkKpiUserIds(conversationIds)

        const kpiResults = await Promise.all(
          kpiBatches.map(async (ids) => normalizeKpi(await api.getKpiDashboard(validToken, ids))),
        )

        if (!active) return

        setAppointments(agenda)
        setConversations(conversas)
        setTopics(assuntos)
        setKpiData(mergeKpis(kpiResults))
        setReferenceDate(new Date())
      } catch (err) {
        if (!active) return
        setError(getErrorMessage(err))
      } finally {
        if (active) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    loadDashboard(authToken)

    return () => {
      active = false
    }
  }, [token, refreshRequest])

  useEffect(() => {
    if (!token) {
      setHeaderRefresh(null)
      return () => setHeaderRefresh(null)
    }

    setHeaderRefresh({
      onRefresh: refreshDashboard,
      isRefreshing: refreshing,
    })

    return () => setHeaderRefresh(null)
  }, [refreshDashboard, refreshing, setHeaderRefresh, token])

  const last7Days = useMemo<DayBucket[]>(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(referenceDate)
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (6 - index))

      return {
        isoDate: toDateKey(date),
        label: toDayLabel(date),
      }
    })
  }, [referenceDate])

  const atendimentosPorDia = useMemo(() => {
    return last7Days.map((day) => {
      const atendimentos = appointments.filter((appointment) => {
        const date = toDate(appointment.inicio_em)
        const status = normalizeStatus(appointment.status)

        return (
          date !== null &&
          toDateKey(date) === day.isoDate &&
          !CANCELED_STATUSES.has(status)
        )
      }).length

      return {
        dia: day.label,
        atendimentos,
      }
    })
  }, [appointments, last7Days])

  const agendamentosStackedPorDia = useMemo(() => {
    return last7Days.map((day) => {
      const dayAppointments = appointments.filter((appointment) => {
        const date = toDate(appointment.inicio_em)
        return date !== null && toDateKey(date) === day.isoDate
      })

      return {
        dia: day.label,
        confirmados: dayAppointments.filter((appointment) =>
          CONFIRMED_STATUSES.has(normalizeStatus(appointment.status)),
        ).length,
        pendentes: dayAppointments.filter((appointment) =>
          PENDING_STATUSES.has(normalizeStatus(appointment.status)),
        ).length,
        cancelados: dayAppointments.filter((appointment) =>
          CANCELED_STATUSES.has(normalizeStatus(appointment.status)),
        ).length,
      }
    })
  }, [appointments, last7Days])

  const assuntosDonut = useMemo(() => {
    const entries = topics
      .map((topic) => [topic.name, Number(topic.value) || 0] as [string, number])
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])

    if (entries.length === 0) {
      return [{ name: 'Sem dados', value: 100, color: '#9CA3AF' }]
    }

    const visibleEntries = entries.slice(0, 4)
    const remainingTotal = entries.slice(4).reduce((sum, [, count]) => sum + count, 0)
    const groupedEntries =
      remainingTotal > 0 ? [...visibleEntries, ['Outros', remainingTotal] as [string, number]] : visibleEntries
    const total = groupedEntries.reduce((sum, [, count]) => sum + count, 0)

    return groupedEntries.map(([name, count], index) => ({
      name,
      value: Math.round((count / total) * 100),
      color: TOPIC_COLORS[index % TOPIC_COLORS.length],
    }))
  }, [topics])

  const metrics = useMemo<DashboardMetric[]>(() => {
    const now = new Date()
    const futureAppointments = appointments.filter((appointment) => {
      const date = toDate(appointment.inicio_em)
      const status = normalizeStatus(appointment.status)
      return date !== null && date > now && ACTIVE_FUTURE_STATUSES.has(status)
    }).length
    const uniqueContacts = uniqueValues(conversations.map(getConversationId)).length

    return [
      {
        id: 'conversas',
        titulo: 'Conversas totais',
        valor: formatNumber(conversations.length),
        tendencia: 'Registradas no WhatsApp',
        tendenciaPositiva: true,
      },
      {
        id: 'usuarios',
        titulo: 'Usuários únicos',
        valor: formatNumber(uniqueContacts),
        tendencia: 'Contatos identificados',
        tendenciaPositiva: true,
      },
      {
        id: 'mensagens',
        titulo: 'Mensagens trocadas',
        valor: formatNumber(kpiData.totalMessages),
        tendencia: 'Entrada e saída do bot',
        tendenciaPositiva: true,
      },
      {
        id: 'agendamentos',
        titulo: 'Agendamentos futuros',
        valor: formatNumber(futureAppointments),
        tendencia: 'Pendentes ou confirmados',
        tendenciaPositiva: true,
      },
      {
        id: 'atualizacao',
        titulo: 'Última atualização',
        valor: formatLastUpdated(kpiData.lastUpdated),
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
      <div className="flex flex-1 items-center justify-center rounded-xl border border-red-100 bg-red-50 p-6 font-medium text-[#CC2229]">
        {error}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 pb-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metricIcons[metric.id]
          const isUpdateCard = metric.id === 'atualizacao'

          return (
            <article
              key={metric.id}
              className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-500">{metric.titulo}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-[#0D1B4B]">
                    {metric.valor}
                  </p>
                  <p
                    className={[
                      'mt-1 text-xs font-semibold',
                      metric.tendenciaPositiva ? 'text-emerald-600' : 'text-slate-500',
                    ].join(' ')}
                  >
                    {metric.tendencia}
                  </p>
                </div>
                <div
                  className={[
                    'flex h-11 w-11 items-center justify-center rounded-xl',
                    isUpdateCard ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-[#2563EB]',
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
              {assuntosDonut.map((subject) => (
                <li key={subject.name} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ backgroundColor: subject.color }}
                    />
                    {subject.name}
                  </span>
                  <span className="font-semibold text-slate-800">{subject.value}%</span>
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
