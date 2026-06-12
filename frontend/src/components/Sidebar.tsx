import { NavLink } from 'react-router-dom'
import {
  BookOpen,
  Calendar,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
} from 'lucide-react'
import { RobotIcon } from './RobotIcon'
import { useAuth } from '../hooks/useAuth'
import { useLayoutShell } from '../hooks/useLayoutShell'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/conversas', label: 'Conversas', icon: MessageSquare },
  { to: '/agendamentos', label: 'Agendamentos', icon: Calendar },
  { to: '/usuarios', label: 'Usuários', icon: Users },
  { to: '/base-de-conhecimento', label: 'Base de Conhecimento', icon: BookOpen },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const { logout, user } = useAuth()
  const { setSidebarOpen } = useLayoutShell()

  const userName = user?.nome?.trim() || 'Usuario'
  const userRole = user?.perfil === 'admin' ? 'Administrador' : 'Atendente'

  const linkBase =
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-blue-100/85 transition hover:bg-white/5 hover:text-white'
  const visibleNav =
    user?.perfil === 'admin' ? nav : nav.filter((item) => item.to !== '/usuarios')

  return (
    <aside className="flex h-full w-[250px] shrink-0 flex-col bg-gradient-to-b from-[#0a1628] to-[#0d1f4c] text-white shadow-xl">
      <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-4 pt-6">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#0D1B4B] ring-2 ring-white/10">
            <RobotIcon className="text-3xl" />
          </div>
          <p className="text-base font-bold tracking-tight">Procon Bot</p>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-100/70">
            Jacareí
          </p>
        </div>

        <nav className="flex flex-col gap-1">
          {visibleNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                [
                  linkBase,
                  isActive
                    ? 'bg-[#2563EB] text-white shadow-md shadow-blue-900/30'
                    : '',
                ].join(' ')
              }
            >
              <Icon className="size-[18px] shrink-0 opacity-90" aria-hidden />
              <span className="leading-snug">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="relative px-4 pb-5 pt-2">
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 opacity-90"
          aria-hidden
        >
          <svg viewBox="0 0 250 50" className="h-full w-full text-[#CC2229]">
            <path
              fill="currentColor"
              d="M0 50 Q60 10 120 35 T250 20 L250 50 Z"
              opacity={0.35}
            />
            <path
              fill="#ffffff"
              d="M0 50 Q80 25 140 40 T250 30 L250 50 Z"
              opacity={0.12}
            />
          </svg>
        </div>
        <div className="relative z-10 rounded-xl bg-white/5 px-3 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
              <Users className="size-4 text-blue-100" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{userName}</p>
              <p className="truncate text-xs text-blue-100/65">{userRole}</p>
            </div>
          </div>
          <button
            type="button"
            className="mt-2 w-full text-left text-xs font-medium text-blue-200/80 underline-offset-2 hover:text-white hover:underline"
            onClick={() => {
              setSidebarOpen(false)
              logout()
            }}
          >
            Sair
          </button>
        </div>
      </div>
    </aside>
  )
}
