import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, LogIn, Mail, UserPlus } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { RobotIcon } from '../components/RobotIcon'
import { api } from '../services/api'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPwd, setShowPwd] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await api.login(email, password)
      login(res.dados.token, res.dados.usuario)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Credenciais inválidas.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <section className="relative flex min-h-[320px] flex-[0_0_40%] flex-col items-center justify-center overflow-hidden bg-[#0D1B4B] px-8 py-12 text-center lg:min-h-screen">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800'%3E%3Cpath fill='%23ffffff' d='M200 650 L400 200 L600 500 L900 150 L1100 650 Z' opacity='0.25'/%3E%3C/svg%3E")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#1a2d6b]/80 to-[#0D1B4B]" />

        <div className="relative z-10 flex max-w-md flex-col items-center">
          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="relative rounded-[2rem] border border-white/20 bg-white/10 px-6 py-5 shadow-lg backdrop-blur-sm">
              <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#CC2229]" />
              <RobotIcon className="text-5xl" />
            </div>
            <div>
              <p className="text-3xl font-extrabold tracking-tight">
                <span className="text-white">PRO</span>
                <span className="text-[#CC2229]">CON</span>
              </p>
              <div className="mt-2 flex flex-col items-center gap-1">
                <span className="rounded-lg bg-[#0a1628] px-3 py-1 text-sm font-bold uppercase tracking-wider text-white">
                  Bot
                </span>
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-white/90">
                  Jacareí
                </p>
              </div>
            </div>
          </div>
          <div className="mx-auto mb-6 h-px w-32 bg-white/40" />
          <p className="text-sm font-medium leading-relaxed text-white/90">
            Defendendo direitos, construindo relações de confiança.
          </p>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-28">
          <svg viewBox="0 0 400 120" className="h-full w-full" preserveAspectRatio="none">
            <path
              fill="#CC2229"
              d="M0 120 C80 40 160 100 240 60 S360 20 400 80 L400 120 Z"
              opacity={0.45}
            />
            <path
              fill="#ffffff"
              d="M0 120 C100 70 200 110 300 75 S380 50 400 90 L400 120 Z"
              opacity={0.15}
            />
          </svg>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center bg-[#f4f6fb] px-4 py-10 lg:px-12">
        <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/60">
          <h2 className="text-2xl font-bold text-[#0D1B4B]">Bem-vindo(a)!</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Faça login para acessar o painel administrativo do{' '}
            <span className="font-semibold text-[#0D1B4B]">Procon Bot.</span>
          </p>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-[#CC2229] border border-red-100 font-medium">
              {error}
            </div>
          )}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                E-mail
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Digite seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none ring-[#2563EB]/30 transition focus:border-[#2563EB] focus:ring-2"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Senha
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-11 text-sm outline-none ring-[#2563EB]/30 transition focus:border-[#2563EB] focus:ring-2"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPwd ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              <div className="mt-2 text-right">
                <Link
                  to="#"
                  className="text-sm font-medium text-[#2563EB] hover:underline"
                  onClick={(e) => e.preventDefault()}
                >
                  Esqueceu sua senha?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0D1B4B] py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#152a6e] disabled:opacity-50"
            >
              <LogIn className="size-4" aria-hidden />
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 font-medium text-slate-400">ou</span>
            </div>
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0D1B4B] bg-white py-3 text-sm font-semibold text-[#0D1B4B] transition hover:bg-slate-50"
          >
            <UserPlus className="size-4" aria-hidden />
            Cadastrar-se
          </button>
        </div>
      </section>
    </div>
  )
}
