import { Navigate, Outlet, useLocation, useOutletContext } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { UserInfo } from '../context/auth-context'

type ProtectedRouteProps = {
  allowedProfiles?: UserInfo['perfil'][]
}

export function ProtectedRoute({ allowedProfiles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const outletContext = useOutletContext<unknown>()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (allowedProfiles && (!user || !allowedProfiles.includes(user.perfil))) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet context={outletContext} />
}
