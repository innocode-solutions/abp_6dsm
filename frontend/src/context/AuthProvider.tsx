import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type UserInfo } from './auth-context'

const TOKEN_KEY = 'procon-bot-auth-token'
const USER_KEY = 'procon-bot-auth-user'

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function getStoredUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken)
  const [user, setUser] = useState<UserInfo | null>(getStoredUser)

  const isAuthenticated = useMemo(() => token !== null, [token])

  const login = useCallback((newToken: string, newUser: UserInfo) => {
    try {
      localStorage.setItem(TOKEN_KEY, newToken)
      localStorage.setItem(USER_KEY, JSON.stringify(newUser))
    } catch {
      /* ignore */
    }
    setToken(newToken)
    setUser(newUser)
  }, [])

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    } catch {
      /* ignore */
    }
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ isAuthenticated, token, user, login, logout }),
    [isAuthenticated, token, user, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
