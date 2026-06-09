import { useMemo, useState, useEffect } from 'react'
import { Eye, Search, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { api } from '../services/api'

type StatusConversa = 'Ativo' | 'Pendente' | 'Resolvido' | 'Atenção'

const statusOptions: (StatusConversa | 'Todos')[] = [
  'Todos',
  'Ativo',
  'Pendente',
  'Resolvido',
  'Atenção',
]

const assuntoOptions = ['Todos', 'Conversa Chatbot', 'Outros']

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
  const { token } = useAuth()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<(typeof statusOptions)[number]>('Todos')
  const [assunto, setAssunto] = useState('Todos')

  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Details Modal state
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    if (!token) return

    async function loadConversations() {
      try {
        setLoading(true)
        setError(null)
        const res = await api.getConversas(token!)
        setConversations(res.dados || [])
      } catch (err: any) {
        setError(err.message || 'Falha ao carregar conversas')
      } finally {
        setLoading(false)
      }
    }

    loadConversations()
  }, [token])

  // Fetch chat details when selectedUser changes
  useEffect(() => {
    if (!token || !selectedUser) {
      setChatMessages([])
      return
    }

    async function loadHistory() {
      try {
        setChatLoading(true)
        const res = await api.getHistoricoConversa(token!, selectedUser.id)
        setChatMessages(res.dados || [])
      } catch (err) {
        console.error(err)
      } finally {
        setChatLoading(false)
      }
    }

    loadHistory()
  }, [token, selectedUser])

  const rows = useMemo(() => {
    return conversations.filter((r) => {
      const rowStatus = (r.status || 'Ativo') as StatusConversa
      const rowAssunto = r.assunto || 'Conversa Chatbot'

      if (status !== 'Todos' && rowStatus !== status) return false
      if (assunto !== 'Todos' && rowAssunto !== assunto) return false
      if (q.trim()) {
        const hay = `${r.nome} ${r.identificador}`.toLowerCase()
        if (!hay.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [conversations, q, status, assunto])

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
    <div className="flex flex-1 flex-col gap-4 pb-4">
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm lg:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, número ou ID..."
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
                        statusBadgeClass(r.status || 'Ativo'),
                      ].join(' ')}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedUser(r)}
                      className="inline-flex rounded-lg p-2 text-[#2563EB] hover:bg-sky-50"
                      aria-label="Ver detalhes"
                    >
                      <Eye className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-medium">
                    Nenhuma conversa encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Mostrando <span className="font-semibold text-slate-800">{rows.length > 0 ? 1 : 0}</span> a{' '}
            <span className="font-semibold text-slate-800">{rows.length}</span> de{' '}
            <span className="font-semibold text-slate-800">{rows.length}</span> resultados
          </p>
        </div>
      </div>

      {/* Details Chat History Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <div>
                <h3 className="font-semibold text-[#0D1B4B]">Histórico: {selectedUser.nome}</h3>
                <p className="text-xs text-slate-500">{selectedUser.identificador}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Message History Container */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-4">
              {chatLoading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0D1B4B] border-t-transparent" />
                </div>
              ) : chatMessages.length === 0 ? (
                <p className="text-center text-sm text-slate-500 font-medium">Sem histórico de mensagens.</p>
              ) : (
                chatMessages.map((msg: any) => {
                  const isUser = msg.direction === 'in'
                  return (
                    <div
                      key={msg._id || msg.id}
                      className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                          isUser
                            ? 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                            : 'bg-[#0D1B4B] text-white rounded-tr-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                        <p
                          className={`mt-1 text-[10px] text-right ${
                            isUser ? 'text-slate-400' : 'text-white/60'
                          }`}
                        >
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                            : new Date(msg.clientTimestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                          }
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
