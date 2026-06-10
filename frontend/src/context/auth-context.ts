import { createContext } from 'react'

export type UserInfo = {
  id: string
  nome: string
  email: string
  perfil: 'admin' | 'atendente'
}

export type AuthContextValue = {
  isAuthenticated: boolean
  token: string | null
  user: UserInfo | null
  login: (token: string, user: UserInfo) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
