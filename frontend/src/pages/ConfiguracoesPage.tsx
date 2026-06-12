import { useState, type FormEvent } from 'react'
import { Bell, Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react'
import { api } from '../services/api'
import { useAuth } from '../hooks/useAuth'

export function ConfiguracoesPage() {
  const { token, user } = useAuth()
  const isAdmin = user?.perfil === 'admin'
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [senhaSubmitting, setSenhaSubmitting] = useState(false)
  const [senhaError, setSenhaError] = useState<string | null>(null)
  const [senhaSuccess, setSenhaSuccess] = useState<string | null>(null)

  async function handleSubmitSenha(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return

    if (!senhaAtual.trim() || !novaSenha.trim() || !confirmarSenha.trim()) {
      setSenhaError('Preencha todos os campos de senha.')
      setSenhaSuccess(null)
      return
    }

    if (novaSenha.length < 6) {
      setSenhaError('A nova senha deve ter pelo menos 6 caracteres.')
      setSenhaSuccess(null)
      return
    }

    if (novaSenha !== confirmarSenha) {
      setSenhaError('A confirmacao nao confere com a nova senha.')
      setSenhaSuccess(null)
      return
    }

    try {
      setSenhaSubmitting(true)
      setSenhaError(null)
      await api.alterarSenha(token, senhaAtual, novaSenha)
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarSenha('')
      setSenhaSuccess('Senha alterada com sucesso.')
    } catch (error: any) {
      setSenhaSuccess(null)
      setSenhaError(error.message || 'Falha ao alterar senha.')
    } finally {
      setSenhaSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 pb-4">
      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-[#2563EB]">
            <Mail className="size-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[#0D1B4B]">Notificações por e-mail</h2>
            <p className="mt-1 text-xs text-slate-500">
              Receba alertas sobre mensagens não entendidas e picos de atendimento.
            </p>
            <div className="mt-4 space-y-3">
              <ToggleRow label="Resumo diário" defaultOn />
              <ToggleRow label="Alertas críticos" defaultOn />
            </div>
          </div>
        </div>
      </section>

      {isAdmin && (
      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-[#2563EB]">
            <Shield className="size-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[#0D1B4B]">Segurança</h2>
            <p className="mt-1 text-xs text-slate-500">
              Boas práticas de acesso ao painel (mock — sem integração).
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-medium text-slate-600">
                Tempo de sessão (minutos)
                <input
                  type="number"
                  defaultValue={60}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                />
              </label>
            </div>
          </div>
        </div>
      </section>
      )}

      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-[#2563EB]">
            <Lock className="size-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[#0D1B4B]">Alterar senha</h2>
            <p className="mt-1 text-xs text-slate-500">
              Informe sua senha atual para definir uma nova senha de acesso.
            </p>
            <form onSubmit={handleSubmitSenha} className="mt-4 space-y-3">
              {senhaError && (
                <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-[#CC2229]">
                  {senhaError}
                </div>
              )}
              {senhaSuccess && (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                  {senhaSuccess}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-3">
                <PasswordField
                  label="Senha atual"
                  value={senhaAtual}
                  onChange={setSenhaAtual}
                  autoComplete="current-password"
                />
                <PasswordField
                  label="Nova senha"
                  value={novaSenha}
                  onChange={setNovaSenha}
                  autoComplete="new-password"
                />
                <PasswordField
                  label="Confirmar"
                  value={confirmarSenha}
                  onChange={setConfirmarSenha}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={senhaSubmitting}
                  className="rounded-xl bg-[#0D1B4B] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#152a6e] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {senhaSubmitting ? 'Alterando...' : 'Alterar senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-[#2563EB]">
            <Bell className="size-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[#0D1B4B]">Som e desktop</h2>
            <div className="mt-4">
              <ToggleRow label="Tocar som ao receber nova conversa" />
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-xl bg-[#0D1B4B] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#152a6e]"
        >
          Salvar preferências
        </button>
      </div>
    </div>
  )
}

function ToggleRow({ label, defaultOn }: { label: string; defaultOn?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input type="checkbox" defaultChecked={defaultOn} className="size-4 accent-[#2563EB]" />
    </label>
  )
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
}) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      <div className="relative mt-1">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-10 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          onClick={() => setShowPassword((visible) => !visible)}
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </label>
  )
}
