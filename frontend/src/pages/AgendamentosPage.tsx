import type { FormEvent, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar as CalIcon, Check, ChevronLeft, ChevronRight, ClipboardList, Clock, Plus, Search, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { api, type Feriado, type HorarioDisponivel, type Servico } from '../services/api'
import { useMainLayoutOutlet } from '../hooks/useMainLayoutOutlet'

type StatusAgendamento = 'Confirmado' | 'Pendente' | 'Cancelado'

const initialMonth = new Date()
const initialSelected = new Date()

function formatIsoToBrDate(value: string): string {
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function formatBrDateToIso(value: string): string | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null

  const [, day, month, year] = match
  const parsed = new Date(Number(year), Number(month) - 1, Number(day))
  if (
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day)
  ) {
    return null
  }

  return `${year}-${month}-${day}`
}

function statusRowClass(s: StatusAgendamento) {
  if (s === 'Confirmado') return 'bg-sky-50 text-sky-900'
  if (s === 'Pendente') return 'bg-amber-50 text-amber-900'
  return 'bg-red-50 text-red-900'
}

function statusDot(s: StatusAgendamento) {
  if (s === 'Confirmado') return 'bg-[#0D1B4B]'
  if (s === 'Pendente') return 'bg-amber-500'
  return 'bg-[#CC2229]'
}

function mapStatus(status: string): StatusAgendamento {
  const s = String(status).toLowerCase()
  if (['confirmado', 'check_in_realizado', 'em_atendimento', 'concluido'].includes(s)) {
    return 'Confirmado'
  }
  if (s === 'pendente') {
    return 'Pendente'
  }
  return 'Cancelado'
}

function formatTime(inicio: string, fim: string): string {
  const dStart = new Date(inicio)
  const dEnd = new Date(fim)
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${pad(dStart.getHours())}:${pad(dStart.getMinutes())} - ${pad(dEnd.getHours())}:${pad(dEnd.getMinutes())}`
}

function maskCPF(cpf: string): string {
  if (!cpf) return '***.***.***-**'
  const clean = cpf.replace(/\D/g, '')
  if (clean.length === 11) {
    return `***.***.${clean.substring(6, 9)}-**`
  }
  return '***.***.***-**'
}

export function AgendamentosPage() {
  const { token } = useAuth()
  const { setHeaderExtra, setHeaderRefresh } = useMainLayoutOutlet()
  const novoDataInputRef = useRef<HTMLInputElement | null>(null)
  const [month, setMonth] = useState(initialMonth)
  const [selected, setSelected] = useState(initialSelected)
  const [quick, setQuick] = useState<'Todos' | StatusAgendamento>('Todos')
  const [q, setQ] = useState('')

  const [appointments, setAppointments] = useState<any[]>([])
  const [feriados, setFeriados] = useState<Feriado[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<HorarioDisponivel[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showFeriadoModal, setShowFeriadoModal] = useState(false)
  const [showNovoModal, setShowNovoModal] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<{
    codigo: string
    nome: string
    horario: string
  } | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [feriadoSubmitting, setFeriadoSubmitting] = useState(false)
  const [feriadoError, setFeriadoError] = useState<string | null>(null)
  const [agendamentoSubmitting, setAgendamentoSubmitting] = useState(false)
  const [agendamentoError, setAgendamentoError] = useState<string | null>(null)
  const [horariosLoading, setHorariosLoading] = useState(false)
  const [cancelSubmitting, setCancelSubmitting] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [feriadoForm, setFeriadoForm] = useState({
    data: format(new Date(), 'dd/MM/yyyy'),
    nome: '',
    tipo: 'nacional' as 'nacional' | 'estadual' | 'municipal',
    bloqueia_agendamento: true,
  })
  const [novoForm, setNovoForm] = useState({
    data: format(selected, 'yyyy-MM-dd'),
    servico_id: '',
    horario_id: '',
    nome: '',
    cpf: '',
    assunto: 'Atendimento presencial',
    descricao: '',
  })
  const [cancelMotivo, setCancelMotivo] = useState('Cancelamento administrativo')
  const [cancelCodigo, setCancelCodigo] = useState('')

  const refreshAgenda = useCallback(() => {
    setReloadKey((k) => k + 1)
  }, [])

  async function loadAgenda(isManualRefresh = false) {
    if (!token) return
    try {
      if (isManualRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      setSuccessMessage(null)
      const [agendaRes, feriadosRes] = await Promise.all([
        api.getAgenda(token),
        api.getFeriados(token),
      ])
      setAppointments(agendaRes.dados || [])
      setFeriados(feriadosRes.dados || [])
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar agendamentos')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function loadHorarios(servicoId: string, dataBr: string) {
    if (!token || !servicoId) {
      setHorariosDisponiveis([])
      return
    }

    if (!dataBr) {
      setHorariosDisponiveis([])
      return
    }

    try {
      setHorariosLoading(true)
      const res = await api.getHorariosDisponiveisAdmin(token, servicoId, dataBr)
      setHorariosDisponiveis(res.dados || [])
    } finally {
      setHorariosLoading(false)
    }
  }

  async function openNovoAgendamentoModal() {
    if (!token) return
    setAgendamentoError(null)
    setSuccessMessage(null)
    setNovoForm((form) => ({
      ...form,
      data: format(selected, 'yyyy-MM-dd'),
      horario_id: '',
    }))
    setShowNovoModal(true)
    try {
      const res = await api.getServicos(token)
      const lista = res.dados || []
      setServicos(lista)
      if (!novoForm.servico_id && lista[0]?._id) {
        setNovoForm((form) => ({ ...form, servico_id: lista[0]._id, horario_id: '' }))
      }
    } catch (err: any) {
      setAgendamentoError(err.message || 'Falha ao carregar servicos')
    }
  }

  async function handleSubmitFeriado(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token) return
    if (!feriadoForm.data || !feriadoForm.nome.trim()) {
      setFeriadoError('Preencha data e nome do feriado.')
      return
    }
    const dataIso = formatBrDateToIso(feriadoForm.data)
    if (!dataIso) {
      setFeriadoError('Informe a data no formato dd/mm/aaaa.')
      return
    }
    try {
      setFeriadoSubmitting(true)
      setFeriadoError(null)
      await api.createFeriado(token, {
        data: dataIso,
        nome: feriadoForm.nome.trim(),
        tipo: feriadoForm.tipo,
        bloqueia_agendamento: feriadoForm.bloqueia_agendamento,
      })
      setShowFeriadoModal(false)
      setFeriadoForm({
        data: format(new Date(), 'dd/MM/yyyy'),
        nome: '',
        tipo: 'nacional',
        bloqueia_agendamento: true,
      })
      setReloadKey((k) => k + 1)
      setSuccessMessage('Feriado criado com sucesso.')
    } catch (err: any) {
      setFeriadoError(err.message || 'Falha ao criar feriado')
    } finally {
      setFeriadoSubmitting(false)
    }
  }

  async function handleSubmitNovoAgendamento(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token) return

    if (!novoForm.horario_id || !novoForm.nome.trim() || !novoForm.cpf.trim()) {
      setAgendamentoError('Preencha cliente, CPF e horario.')
      return
    }

    try {
      setAgendamentoSubmitting(true)
      setAgendamentoError(null)
      const res = await api.criarAgendamentoAdmin(token, {
        horario_id: novoForm.horario_id,
        cidadao: {
          nome: novoForm.nome.trim(),
          cpf: novoForm.cpf.trim(),
        },
        assunto: novoForm.assunto.trim() || 'Atendimento presencial',
        descricao: novoForm.descricao.trim() || 'Agendamento criado pelo painel administrativo.',
      })
      setShowNovoModal(false)
      setNovoForm({
        data: format(selected, 'yyyy-MM-dd'),
        servico_id: '',
        horario_id: '',
        nome: '',
        cpf: '',
        assunto: 'Atendimento presencial',
        descricao: '',
      })
      setHorariosDisponiveis([])
      setReloadKey((k) => k + 1)
      setSuccessMessage(`Agendamento ${res.dados.codigo_agendamento} criado com sucesso.`)
    } catch (err: any) {
      setAgendamentoError(err.message || 'Falha ao criar agendamento')
    } finally {
      setAgendamentoSubmitting(false)
    }
  }

  async function handleSubmitCancelamento(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token) return

    const codigo = (cancelTarget?.codigo || cancelCodigo).trim()
    if (!codigo) {
      setCancelError('Informe o codigo do agendamento.')
      return
    }
    if (!cancelMotivo.trim()) {
      setCancelError('Informe o motivo do cancelamento.')
      return
    }

    try {
      setCancelSubmitting(true)
      setCancelError(null)
      const res = await api.cancelarAgendamentoAdmin(
        token,
        codigo,
        cancelMotivo.trim(),
      )
      setCancelTarget(null)
      setShowCancelModal(false)
      setCancelCodigo('')
      setCancelMotivo('Cancelamento administrativo')
      setReloadKey((k) => k + 1)
      setSuccessMessage(`Agendamento ${res.dados.codigo_agendamento} cancelado com sucesso.`)
    } catch (err: any) {
      setCancelError(err.message || 'Falha ao cancelar agendamento')
    } finally {
      setCancelSubmitting(false)
    }
  }

  useEffect(() => {
    setHeaderExtra(
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-[#2563EB] bg-white px-3 py-2 text-sm font-semibold text-[#2563EB] shadow-sm hover:bg-blue-50"
          onClick={() => {
            setFeriadoError(null)
            setShowFeriadoModal(true)
          }}
        >
          <Plus className="size-4" aria-hidden />
          Adicionar Feriado
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-600"
          onClick={openNovoAgendamentoModal}
        >
          <Plus className="size-4" aria-hidden />
          Novo Agendamento
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-[#CC2229] bg-white px-3 py-2 text-sm font-semibold text-[#CC2229] shadow-sm hover:bg-red-50"
          onClick={() => {
            setCancelTarget(null)
            setCancelCodigo('')
            setCancelMotivo('Cancelamento administrativo')
            setCancelError(null)
            setSuccessMessage(null)
            setShowCancelModal(true)
          }}
        >
          <X className="size-4" aria-hidden />
          Cancelar Agendamento
        </button>
      </div>,
    )
    return () => setHeaderExtra(null)
  }, [setHeaderExtra])

  useEffect(() => {
    loadAgenda(reloadKey > 0)
  }, [token, reloadKey])

  useEffect(() => {
    if (!token) {
      setHeaderRefresh(null)
      return () => setHeaderRefresh(null)
    }

    setHeaderRefresh({
      onRefresh: refreshAgenda,
      isRefreshing: refreshing,
    })

    return () => setHeaderRefresh(null)
  }, [refreshAgenda, refreshing, setHeaderRefresh, token])

  useEffect(() => {
    if (!showNovoModal) return
    loadHorarios(novoForm.servico_id, novoForm.data).catch((err: any) => {
      setAgendamentoError(err.message || 'Falha ao carregar horarios')
    })
  }, [showNovoModal, novoForm.servico_id, novoForm.data, token])

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month))
    const end = endOfWeek(endOfMonth(month))
    return eachDayOfInterval({ start, end })
  }, [month])

  const diasComAgendamento = useMemo(() => {
    const set = new Set<number>()
    appointments.forEach((a) => {
      if (!a.inicio_em) return
      const aDate = new Date(a.inicio_em)
      if (
        aDate.getFullYear() === month.getFullYear() &&
        aDate.getMonth() === month.getMonth()
      ) {
        set.add(aDate.getDate())
      }
    })
    return set
  }, [appointments, month])

  const feriadosPorData = useMemo(() => {
    return feriados.reduce<Record<string, Feriado>>((acc, feriado) => {
      if (feriado.data && feriado.bloqueia_agendamento) {
        acc[feriado.data] = feriado
      }
      return acc
    }, {})
  }, [feriados])

  const feriadoSelecionado = feriadosPorData[format(selected, 'yyyy-MM-dd')]

  const metrics = useMemo(() => {
    let confirmados = 0
    let pendentes = 0
    let cancelados = 0
    appointments.forEach((a) => {
      const s = mapStatus(a.status)
      if (s === 'Confirmado') confirmados++
      else if (s === 'Pendente') pendentes++
      else cancelados++
    })
    return {
      total: appointments.length,
      confirmados,
      pendentes,
      cancelados,
    }
  }, [appointments])

  const filteredList = useMemo(() => {
    return appointments
      .filter((a) => {
        if (!a.inicio_em) return false
        const aDate = new Date(a.inicio_em)
        if (!isSameDay(aDate, selected)) return false

        const statusMapped = mapStatus(a.status)
        if (quick !== 'Todos' && statusMapped !== quick) return false

        if (q.trim()) {
          const nomeMatch = (a.cidadao?.nome || '').toLowerCase().includes(q.toLowerCase())
          const cpfMatch = (a.cidadao?.cpf || '').includes(q)
          const descMatch = (a.descricao || '').toLowerCase().includes(q.toLowerCase())
          if (!nomeMatch && !cpfMatch && !descMatch) return false
        }
        return true
      })
      .map((a) => {
        const initials = (a.cidadao?.nome || '')
          .split(' ')
          .map((n: string) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()

        return {
          id: a._id || a.id,
          codigo: a.codigo_agendamento || 'Sem codigo',
          nome: a.cidadao?.nome || 'Sem Nome',
          iniciais: initials || 'C',
          cpfMascarado: maskCPF(a.cidadao?.cpf),
          tipoServico: a.servico_id?.nome || 'Geral',
          descricao: a.descricao || a.assunto || '',
          horario: formatTime(a.inicio_em, a.fim_em),
          status: mapStatus(a.status),
          statusOriginal: String(a.status || ''),
        }
      })
  }, [appointments, selected, quick, q])

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
      {showFeriadoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowFeriadoModal(false)
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-[#0D1B4B]">Adicionar Feriado</h2>
              <button
                type="button"
                onClick={() => setShowFeriadoModal(false)}
                className="rounded-lg p-1.5 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X className="size-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmitFeriado} className="flex flex-col gap-4 px-6 py-5">
              {feriadoError && (
                <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-[#CC2229] font-medium">
                  {feriadoError}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="feriado-data" className="text-xs font-semibold text-slate-700">
                  Data *
                </label>
                <input
                  id="feriado-data"
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="dd/mm/aaaa"
                  pattern="\d{2}/\d{2}/\d{4}"
                  value={feriadoForm.data}
                  onChange={(e) => setFeriadoForm((f) => ({ ...f, data: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="feriado-nome" className="text-xs font-semibold text-slate-700">
                  Nome *
                </label>
                <input
                  id="feriado-nome"
                  type="text"
                  required
                  placeholder="Ex: Natal"
                  value={feriadoForm.nome}
                  onChange={(e) => setFeriadoForm((f) => ({ ...f, nome: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="feriado-tipo" className="text-xs font-semibold text-slate-700">
                  Tipo *
                </label>
                <select
                  id="feriado-tipo"
                  value={feriadoForm.tipo}
                  onChange={(e) =>
                    setFeriadoForm((f) => ({
                      ...f,
                      tipo: e.target.value as 'nacional' | 'estadual' | 'municipal',
                    }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                >
                  <option value="nacional">Nacional</option>
                  <option value="estadual">Estadual</option>
                  <option value="municipal">Municipal</option>
                </select>
              </div>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={feriadoForm.bloqueia_agendamento}
                  onChange={(e) =>
                    setFeriadoForm((f) => ({ ...f, bloqueia_agendamento: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 accent-[#2563EB]"
                />
                <span className="text-sm text-slate-700">Bloquear agendamentos neste dia</span>
              </label>
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFeriadoModal(false)}
                  disabled={feriadoSubmitting}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={feriadoSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:opacity-60"
                >
                  {feriadoSubmitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Feriado'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNovoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNovoModal(false)
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-[#0D1B4B]">Novo Agendamento</h2>
              <button
                type="button"
                onClick={() => setShowNovoModal(false)}
                className="rounded-lg p-1.5 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X className="size-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmitNovoAgendamento} className="grid gap-4 px-6 py-5 sm:grid-cols-2">
              {agendamentoError && (
                <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-[#CC2229] sm:col-span-2">
                  {agendamentoError}
                </div>
              )}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-700">Data</span>
                <div className="relative flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#2563EB]/25">
                  <span className="pointer-events-none flex-1 text-slate-900">
                    {formatIsoToBrDate(novoForm.data)}
                  </span>
                  <CalIcon className="pointer-events-none size-4 text-slate-500" aria-hidden />
                  <input
                    ref={novoDataInputRef}
                    type="date"
                    required
                    value={novoForm.data}
                    onChange={(e) =>
                      setNovoForm((form) => ({ ...form, data: e.target.value, horario_id: '' }))
                    }
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Data do agendamento"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-700">Servico</span>
                <select
                  required
                  value={novoForm.servico_id}
                  onChange={(e) =>
                    setNovoForm((form) => ({
                      ...form,
                      servico_id: e.target.value,
                      horario_id: '',
                    }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                >
                  <option value="">Selecione</option>
                  {servicos.map((servico) => (
                    <option key={servico._id} value={servico._id}>
                      {servico.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-xs font-semibold text-slate-700">Horario</span>
                <select
                  required
                  value={novoForm.horario_id}
                  onChange={(e) =>
                    setNovoForm((form) => ({ ...form, horario_id: e.target.value }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                >
                  <option value="">
                    {horariosLoading
                      ? 'Carregando horarios...'
                      : novoForm.servico_id
                        ? 'Selecione um horario disponivel'
                        : 'Selecione um servico primeiro'}
                  </option>
                  {horariosDisponiveis.map((horario) => (
                    <option key={horario._id} value={horario._id}>
                      {formatTime(horario.inicio_em, horario.fim_em)}
                    </option>
                  ))}
                </select>
                {!horariosLoading && novoForm.servico_id && horariosDisponiveis.length === 0 && (
                  <span className="text-xs font-medium text-slate-500">
                    Nenhum horario disponivel para a data selecionada.
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-700">Nome</span>
                <input
                  required
                  value={novoForm.nome}
                  onChange={(e) => setNovoForm((form) => ({ ...form, nome: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-700">CPF</span>
                <input
                  required
                  value={novoForm.cpf}
                  onChange={(e) => setNovoForm((form) => ({ ...form, cpf: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                />
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-xs font-semibold text-slate-700">Assunto</span>
                <input
                  value={novoForm.assunto}
                  onChange={(e) => setNovoForm((form) => ({ ...form, assunto: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                />
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-xs font-semibold text-slate-700">Descricao</span>
                <textarea
                  rows={3}
                  value={novoForm.descricao}
                  onChange={(e) =>
                    setNovoForm((form) => ({ ...form, descricao: e.target.value }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                />
              </label>
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setShowNovoModal(false)}
                  disabled={agendamentoSubmitting}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={agendamentoSubmitting}
                  className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:opacity-60"
                >
                  {agendamentoSubmitting ? 'Salvando...' : 'Criar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(cancelTarget || showCancelModal) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setCancelTarget(null)
              setShowCancelModal(false)
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-[#0D1B4B]">Cancelar Agendamento</h2>
              <button
                type="button"
                onClick={() => {
                  setCancelTarget(null)
                  setShowCancelModal(false)
                }}
                className="rounded-lg p-1.5 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X className="size-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmitCancelamento} className="flex flex-col gap-4 px-6 py-5">
              {cancelError && (
                <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-[#CC2229]">
                  {cancelError}
                </div>
              )}
              {cancelTarget ? (
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <p className="font-semibold">{cancelTarget.codigo}</p>
                  <p>{cancelTarget.nome}</p>
                  <p>{cancelTarget.horario}</p>
                </div>
              ) : (
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-700">Codigo do agendamento</span>
                  <input
                    required
                    value={cancelCodigo}
                    onChange={(e) => setCancelCodigo(e.target.value)}
                    placeholder="AGD-2026-000001"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                  />
                </label>
              )}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-700">Motivo</span>
                <textarea
                  rows={3}
                  required
                  value={cancelMotivo}
                  onChange={(e) => setCancelMotivo(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                />
              </label>
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setCancelTarget(null)
                    setShowCancelModal(false)
                  }}
                  disabled={cancelSubmitting}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={cancelSubmitting}
                  className="rounded-xl bg-[#CC2229] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
                >
                  {cancelSubmitting ? 'Cancelando...' : 'Confirmar Cancelamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {successMessage}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<CalIcon className="size-5 text-[#2563EB]" />}
          label="Total de Agendamentos"
          value={metrics.total}
          sub="No banco de dados"
        />
        <Metric
          icon={<Check className="size-5 text-[#2563EB]" />}
          label="Confirmados"
          value={metrics.confirmados}
          sub="Atendimentos ativos/concluídos"
        />
        <Metric
          icon={<ClipboardList className="size-5 text-amber-500" />}
          label="Pendentes"
          value={metrics.pendentes}
          sub="Aguardando confirmação"
        />
        <Metric
          icon={<X className="size-5 text-[#CC2229]" />}
          label="Cancelados"
          value={metrics.cancelados}
          sub="Expirados ou cancelados"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-4">
          <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                className="rounded-lg p-2 hover:bg-slate-100"
                onClick={() => setMonth((m) => addMonths(m, -1))}
                aria-label="Mês anterior"
              >
                <ChevronLeft className="size-5 text-slate-600" />
              </button>
              <p className="text-sm font-semibold capitalize text-[#0D1B4B]">
                {format(month, 'MMMM yyyy', { locale: ptBR })}
              </p>
              <button
                type="button"
                className="rounded-lg p-2 hover:bg-slate-100"
                onClick={() => setMonth((m) => addMonths(m, 1))}
                aria-label="Próximo mês"
              >
                <ChevronRight className="size-5 text-slate-600" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-slate-400">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {gridDays.map((day) => {
                const inMonth = isSameMonth(day, month)
                const isSelected = isSameDay(day, selected)
                const isToday = isSameDay(day, new Date())
                const dayNum = day.getDate()
                const hasDot = diasComAgendamento.has(dayNum)
                const dateKey = format(day, 'yyyy-MM-dd')
                const feriado = feriadosPorData[dateKey]
                const isFeriado = Boolean(feriado)

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={!inMonth}
                    onClick={() => inMonth && setSelected(day)}
                    title={feriado ? feriado.nome : undefined}
                    aria-label={feriado ? `${dayNum}, feriado: ${feriado.nome}` : undefined}
                    className={[
                      'relative flex h-10 flex-col items-center justify-center rounded-lg text-sm font-medium transition',
                      !inMonth ? 'text-slate-300' : 'text-slate-800 hover:bg-slate-50',
                      isSelected ? 'bg-[#2563EB] text-white hover:bg-blue-600' : '',
                      isFeriado && inMonth && !isSelected ? 'bg-red-50 text-[#CC2229] hover:bg-red-100' : '',
                      isToday && !isSelected ? 'ring-2 ring-[#2563EB]/40' : '',
                    ].join(' ')}
                  >
                    <span>{dayNum}</span>
                    {isFeriado && inMonth ? (
                      <span
                        className={[
                          'mt-0.5 h-1.5 w-1.5 rounded-full',
                          isSelected ? 'bg-white' : 'bg-[#CC2229]',
                        ].join(' ')}
                      />
                    ) : hasDot && inMonth ? (
                      <span
                        className={[
                          'mt-0.5 h-1 w-1 rounded-full',
                          isSelected ? 'bg-white' : 'bg-[#2563EB]',
                        ].join(' ')}
                      />
                    ) : (
                      <span className="mt-0.5 h-1 w-1" />
                    )}
                  </button>
                )
              })}
            </div>
            {feriadoSelecionado && (
              <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-[#CC2229]">
                <p className="font-semibold">
                  {feriadoSelecionado.nome} - {formatIsoToBrDate(feriadoSelecionado.data)}
                </p>
                <p className="text-xs text-red-700">
                  Feriado {feriadoSelecionado.tipo}. Agendamentos bloqueados neste dia.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-[#0D1B4B]">Filtros Rápidos</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {(['Todos', 'Confirmado', 'Pendente'] as const).map((f) => {
                const active =
                  f === 'Todos' ? quick === 'Todos' : quick === (f as StatusAgendamento)
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setQuick(f === 'Todos' ? 'Todos' : f)}
                    className={[
                      'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                      active
                        ? 'bg-sky-100 text-[#0D1B4B]'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                    ].join(' ')}
                  >
                    {f === 'Todos' ? 'Todos' : f + 's'}
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm lg:col-span-8 lg:p-6">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#0D1B4B]">Próximos Agendamentos</h2>
              <p className="text-xs text-slate-500">
                Dia selecionado:{' '}
                <span className="font-semibold text-slate-700">
                  {format(selected, 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Dia {format(selected, 'dd/MM', { locale: ptBR })}
              </span>
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">Nome do Cliente</th>
                  <th className="px-3 py-3">Codigo</th>
                  <th className="px-3 py-3">Tipo de Serviço</th>
                  <th className="px-3 py-3">Horário</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2563EB] text-xs font-bold text-white">
                          {a.iniciais}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{a.nome}</p>
                          <p className="text-xs text-slate-500">CPF {a.cpfMascarado}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {a.codigo}
                      </span>
                    </td>
                    <td className="max-w-xs px-3 py-4">
                      <p className="font-medium text-slate-800">{a.tipoServico}</p>
                      <p className="text-xs text-slate-500">{a.descricao}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-slate-700">
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <Clock className="size-4 text-slate-400" />
                        {a.horario}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={[
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                          statusRowClass(a.status),
                        ].join(' ')}
                      >
                        <span className={`size-1.5 rounded-full ${statusDot(a.status)}`} />
                        {a.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      <button
                        type="button"
                        disabled={a.status === 'Cancelado'}
                        onClick={() => {
                          setCancelError(null)
                          setSuccessMessage(null)
                          setShowCancelModal(true)
                          setCancelTarget({
                            codigo: a.codigo,
                            nome: a.nome,
                            horario: a.horario,
                          })
                        }}
                        className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-[#CC2229] hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-500 font-medium">
                      Nenhum agendamento para este dia.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Mostrando <span className="font-semibold">{filteredList.length > 0 ? 1 : 0}</span>-
              <span className="font-semibold">{filteredList.length}</span> de{' '}
              <span className="font-semibold">{filteredList.length}</span> agendamentos do dia
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
  sub,
  subPositive,
}: {
  icon: ReactNode
  label: string
  value: number
  sub: string
  subPositive?: boolean
}) {
  const subColor =
    subPositive === undefined
      ? 'text-slate-500'
      : subPositive
        ? 'text-emerald-600'
        : 'text-[#CC2229]'

  return (
    <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-[#0D1B4B]">{value}</p>
          <p className={`mt-1 text-xs font-semibold ${subColor}`}>{sub}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50">
          {icon}
        </div>
      </div>
    </article>
  )
}
