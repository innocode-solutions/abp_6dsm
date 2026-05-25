import { useEffect } from 'react'
import { Pencil, Search, Trash2, UserPlus } from 'lucide-react'
import { usuariosMock, type PapelUsuario } from '../data/mockData'
import { useMainLayoutOutlet } from '../hooks/useMainLayoutOutlet'

function papelBadge(p: PapelUsuario) {
  if (p === 'Administrador')
    return 'bg-[#0D1B4B] text-white border border-[#0D1B4B]'
  if (p === 'Editor')
    return 'bg-white text-slate-700 border border-slate-300'
  return 'bg-slate-200 text-slate-700 border border-slate-200'
}

export function UsuariosPage() {
  const { setHeaderExtra } = useMainLayoutOutlet()

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

  return (
    <div className="flex flex-1 flex-col gap-4 pb-4">
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Buscar usuários..."
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
              {usuariosMock.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={[
                          'flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold',
                          u.avatarClass,
                        ].join(' ')}
                      >
                        {u.iniciais}
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
                        papelBadge(u.papel),
                      ].join(' ')}
                    >
                      {u.papel}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
