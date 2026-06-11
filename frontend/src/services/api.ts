const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let errorMessage = `Erro HTTP ${response.status}`
    try {
      const errorJson = await response.json()
      if (errorJson?.erro?.mensagem) {
        errorMessage = errorJson.erro.mensagem
      } else if (errorJson?.error) {
        errorMessage = errorJson.error
      }
    } catch {
      /* ignore */
    }
    throw new Error(errorMessage)
  }

  return response.json() as Promise<T>
}

export const api = {
  async login(email: string, senha: string) {
    return request<{ dados: { token: string; usuario: any } }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    })
  },

  async getAgenda(token: string, data?: string) {
    const query = data ? `?data=${encodeURIComponent(data)}` : ''
    return request<{ dados: any[] }>(`/api/v1/agendamentos/admin/agenda${query}`, {}, token)
  },

  async getFuncionarios(token: string) {
    return request<{ dados: any[] }>('/api/v1/agendamentos/admin/funcionarios', {}, token)
  },

  async getConversas(token: string) {
    return request<{ dados: any[] }>('/api/v1/agendamentos/admin/conversas', {}, token)
  },

  async getHistoricoConversa(token: string, userId: string) {
    return request<{ dados: any[] }>(`/api/v1/agendamentos/admin/conversas/${encodeURIComponent(userId)}`, {}, token)
  },

  async getKpiDashboard(token: string, userIds: string[]) {
    const query = userIds.length > 0 ? `?users=${encodeURIComponent(userIds.join(','))}` : ''
    return request<any>(`/api/kpi/dashboard${query}`, {}, token)
  },

  async criarFuncionario(
    token: string,
    dados: {
      nome: string
      email: string
      perfil: 'admin' | 'atendente'
      senha: string
    }
  ) {
    return request<{ dados: any }>('/api/v1/agendamentos/admin/funcionarios', {
      method: 'POST',
      body: JSON.stringify(dados),
    }, token)
  },

  async editarFuncionario(
    token: string,
    id: string,
    dados: {
      nome?: string
      email?: string
      perfil?: 'admin' | 'atendente'
      ativo?: boolean
      senha?: string
    }
  ) {
    return request<{ dados: any }>(`/api/v1/agendamentos/admin/funcionarios/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }, token)
  },

  async excluirFuncionario(token: string, id: string) {
    return request<{ dados: any }>(`/api/v1/agendamentos/admin/funcionarios/${id}`, {
      method: 'DELETE',
    }, token)
  },
}