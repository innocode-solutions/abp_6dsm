import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { useAuth } from './hooks/useAuth'
import { LayoutShellProvider } from './context/LayoutShellProvider'
import { HeaderProvider } from './context/HeaderContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ConversasPage } from './pages/ConversasPage'
import { AgendamentosPage } from './pages/AgendamentosPage'
import { UsuariosPage } from './pages/UsuariosPage'
import { MensagensNaoEntendidasPage } from './pages/MensagensNaoEntendidasPage'
import { BaseConhecimentoPage } from './pages/BaseConhecimentoPage'
import { RelatoriosPage } from './pages/RelatoriosPage'
import { ConfiguracoesPage } from './pages/ConfiguracoesPage'

function LoginRoute() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }
  return <LoginPage />
}

function RootRedirect() {
  const { isAuthenticated } = useAuth()
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route element={<ProtectedRoute />}>
            <Route
              element={
                <LayoutShellProvider>
                  <HeaderProvider>
                    <Layout />
                  </HeaderProvider>
                </LayoutShellProvider>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/conversas" element={<ConversasPage />} />
              <Route path="/agendamentos" element={<AgendamentosPage />} />
              <Route path="/usuarios" element={<UsuariosPage />} />
              <Route
                path="/mensagens-nao-entendidas"
                element={<MensagensNaoEntendidasPage />}
              />
              <Route path="/base-de-conhecimento" element={<BaseConhecimentoPage />} />
              <Route path="/relatorios" element={<RelatoriosPage />} />
              <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            </Route>
          </Route>
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}