import { useEffect, useState, useMemo } from 'react'
import { Pencil, Search, Trash2, UserPlus } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { api } from '../services/api'
import { useMainLayoutOutlet } from '../hooks/useMainLayoutOutlet'

function papelBadge(p: string) {
  if (p === 'Administrador')
    return 'bg-[#0D1B4B] text-white border border-[#0D1B4B]'
  return 'bg-white text-slate-700 border border-slate-300'
}

export function UsuariosPage() {
  const { token } = useAuth()
  const { setHeaderExtra } = useMainLayoutOutlet()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    setHeaderExtra(
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-600"
      >
        <UserPlus className="size-4" aria-hidden />
        Adicionar Usuário
      </button>,
    )
    return () => setHeaderExtra(null)
  }, [setHeaderExtra])

  useEffect(() => {
    if (!token) return

    async function loadUsers() {
      try {
        setLoading(true)
        setError(null)
        const res = await api.getFuncionarios(token!)
        setUsers(res.dados || [])
      } catch (err: any) {
        setError(err.message || 'Falha ao carregar usuários')
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [token])

  const filteredList = useMemo(() => {
    return users.filter((u) => {
      if (!q.trim()) return true
      const query = q.toLowerCase()
      return (
        (u.nome || '').toLowerCase().includes(query) ||
        (u.email || '').toLowerCase().includes(query)
      )
    })
  }, [users, q])

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Buscar usuários..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
            />
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Função</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredList.map((u) => {
                const initials = (u.nome || '')
                  .split(' ')
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'OP'

                const papelLabel = u.perfil === 'admin' ? 'Administrador' : 'Atendente'

                return (
                  <tr key={u._id || u.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold bg-[#0D1B4B] text-white">
                          {initials}
                        </div>
                        <p className="font-semibold text-slate-900">{u.nome}</p>
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-4 text-slate-600">
                      <span className="break-all">{u.email}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={[
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          papelBadge(papelLabel),
                        ].join(' ')}
                      >
                        {papelLabel}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                        <span
                          className={[
                            'size-2 rounded-full',
                            u.ativo ? 'bg-emerald-500' : 'bg-slate-400',
                          ].join(' ')}
                        />
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                          aria-label="Editar"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          aria-label="Excluir"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
