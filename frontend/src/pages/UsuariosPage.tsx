import { useEffect, useState, useMemo, type FormEvent } from 'react'
import { Pencil, Search, Trash2, UserPlus, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { api } from '../services/api'
import { useMainLayoutOutlet } from '../hooks/useMainLayoutOutlet'

type Perfil = 'admin' | 'atendente'

type FormState = {
  nome: string
  email: string
  perfil: Perfil
  senha: string
  ativo: boolean
}

function papelBadge(p: string) {
  if (p === 'Administrador')
    return 'bg-[#0D1B4B] text-white border border-[#0D1B4B]'
  return 'bg-white text-slate-700 border border-slate-300'
}

const initialForm: FormState = {
  nome: '',
  email: '',
  perfil: 'atendente',
  senha: '',
  ativo: true,
}

export function UsuariosPage() {
  const { token, user } = useAuth()
  const { setHeaderExtra } = useMainLayoutOutlet()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [form, setForm] = useState<FormState>(initialForm)

  const isAdmin = user?.perfil === 'admin'

  function getUserId(u: any) {
    return String(u._id || u.id)
  }

  function openCreateModal() {
    setEditingUser(null)
    setForm(initialForm)
    setModalError(null)
    setModalOpen(true)
  }

  function openEditModal(u: any) {
    setEditingUser(u)
    setForm({
      nome: u.nome || '',
      email: u.email || '',
      perfil: u.perfil === 'admin' ? 'admin' : 'atendente',
      senha: '',
      ativo: u.ativo !== false,
    })
    setModalError(null)
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
    setEditingUser(null)
    setForm(initialForm)
    setModalError(null)
  }

  useEffect(() => {
    if (!isAdmin) {
      setHeaderExtra(null)
      return
    }

    setHeaderExtra(
      <button
        type="button"
        onClick={openCreateModal}
        className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-600"
      >
        <UserPlus className="size-4" aria-hidden />
        Adicionar Usuário
      </button>,
    )

    return () => setHeaderExtra(null)
  }, [setHeaderExtra, isAdmin])

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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token || !isAdmin) return

    try {
      setSaving(true)
      setModalError(null)

      if (!form.nome.trim() || !form.email.trim() || !form.perfil) {
        setModalError('Preencha nome, email e perfil.')
        return
      }

      if (!editingUser && !form.senha.trim()) {
        setModalError('Informe uma senha para criar o usuário.')
        return
      }

      if (editingUser) {
        const dadosAtualizacao: {
          nome: string
          email: string
          perfil: Perfil
          ativo: boolean
          senha?: string
        } = {
          nome: form.nome.trim(),
          email: form.email.trim(),
          perfil: form.perfil,
          ativo: form.ativo,
        }

        if (form.senha.trim()) {
          dadosAtualizacao.senha = form.senha.trim()
        }

        const res = await api.editarFuncionario(
          token,
          getUserId(editingUser),
          dadosAtualizacao,
        )

        setUsers((prev) =>
          prev.map((u) => (getUserId(u) === getUserId(editingUser) ? res.dados : u)),
        )
      } else {
        const res = await api.criarFuncionario(token, {
          nome: form.nome.trim(),
          email: form.email.trim(),
          perfil: form.perfil,
          senha: form.senha.trim(),
        })

        setUsers((prev) => [res.dados, ...prev])
      }

      closeModal()
    } catch (err: any) {
      setModalError(err.message || 'Falha ao salvar usuário.')
    } finally {
      setSaving(false)
    }
  }

  async function handleExcluir(u: any) {
    if (!token || !isAdmin) return

    const confirmar = window.confirm(
      `Deseja desativar o usuário ${u.nome || 'selecionado'}?`,
    )

    if (!confirmar) return

    try {
      const res = await api.excluirFuncionario(token, getUserId(u))

      setUsers((prev) =>
        prev.map((item) => (getUserId(item) === getUserId(u) ? res.dados : item)),
      )
    } catch (err: any) {
      setError(err.message || 'Falha ao excluir usuário.')
    }
  }

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
      {!isAdmin && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm font-medium text-amber-800">
          Você não possui permissão para criar, editar ou excluir usuários.
        </div>
      )}

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
                  <tr key={getUserId(u)} className="hover:bg-slate-50/60">
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
                      {isAdmin ? (
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            aria-label="Editar"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExcluir(u)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                            aria-label="Excluir"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">
                          Sem permissão
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center font-medium text-slate-500">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <div>
                <h3 className="font-semibold text-[#0D1B4B]">
                  {editingUser ? 'Editar usuário' : 'Adicionar usuário'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingUser
                    ? 'Atualize os dados do funcionário.'
                    : 'Cadastre um novo funcionário no sistema.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              {modalError && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-[#CC2229]">
                  {modalError}
                </div>
              )}

              <label className="block text-xs font-medium text-slate-600">
                Nome
                <input
                  required
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                />
              </label>

              <label className="block text-xs font-medium text-slate-600">
                Email
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-medium text-slate-600">
                  Perfil
                  <select
                    value={form.perfil}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        perfil: e.target.value as Perfil,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                  >
                    <option value="atendente">Atendente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </label>

                <label className="block text-xs font-medium text-slate-600">
                  Status
                  <select
                    value={form.ativo ? 'ativo' : 'inativo'}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        ativo: e.target.value === 'ativo',
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </label>
              </div>

              <label className="block text-xs font-medium text-slate-600">
                Senha {editingUser ? '(opcional)' : ''}
                <input
                  type="password"
                  required={!editingUser}
                  value={form.senha}
                  onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                  placeholder={
                    editingUser
                      ? 'Deixe em branco para manter a senha atual'
                      : 'Informe a senha inicial'
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                />
              </label>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : editingUser ? 'Salvar alterações' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}