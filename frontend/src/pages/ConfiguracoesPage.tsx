import { useState, useEffect } from 'react'
import { Lock, User, Eye, EyeOff } from 'lucide-react'
import { api } from '../services/api'
import { useAuth } from '../hooks/useAuth'

export function ConfiguracoesPage() {
  // Puxa o token e os dados do usuário da memória do contexto!
  const { token, usuario, user } = useAuth() as any
  const usuarioLogado = usuario || user

  // 1. Estados de Controle de Tela
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // 2. Estados para o Perfil
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [perfilAcesso, setPerfilAcesso] = useState('Carregando...')

  // 3. Estados para a Senha
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  
  // 4. Estados para visualização
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false)

  // 5. Preenche os dados assim que a tela abre, pegando da memória do login
  useEffect(() => {
    if (usuarioLogado) {
      setNome(usuarioLogado.nome || '')
      setEmail(usuarioLogado.email || '')
      setPerfilAcesso(usuarioLogado.perfil || 'Usuário')
    } else {
      setPerfilAcesso('Não identificado')
    }
    setIsLoading(false) // Tira a tela de carregamento na mesma hora
  }, [usuarioLogado])

  const handleSalvarPreferencias = async () => {
    // Validações antes de chamar a API
    if (novaSenha || confirmarSenha) {
      if (!senhaAtual) {
        alert('Por favor, informe sua senha atual para realizar a alteração.')
        return
      }
      if (novaSenha !== confirmarSenha) {
        alert('As senhas novas não coincidem. Verifique e tente novamente.')
        return
      }
    }

    try {
      setIsSaving(true)

      // Fluxo 1: Alteração de senha
      if (senhaAtual && novaSenha) {
        await api.alterarSenha(token || '', senhaAtual, novaSenha)
        alert('Senha atualizada com sucesso!')
        
        // Limpa os campos de senha após salvar
        setSenhaAtual('')
        setNovaSenha('')
        setConfirmarSenha('')
      }

      // Fluxo 2: Alteração de perfil (Nome e E-mail)
      if (nome || email) {
        await api.atualizarMeuPerfil(token || '', { nome, email })
        if (!senhaAtual) {
           alert('Perfil atualizado com sucesso!')
        }
      }

    } catch (error: any) {
      console.error('Erro ao salvar preferências:', error)
      alert(error.message || 'Ocorreu um erro ao salvar as alterações.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center pb-4">
        <p className="text-sm font-medium text-slate-500">Carregando configurações...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 pb-4">
      
      {/* SEÇÃO: PERFIL DO USUÁRIO */}
      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-[#2563EB]">
            <User className="size-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[#0D1B4B]">Perfil do usuário</h2>
            <p className="mt-1 text-xs text-slate-500">
              Atualize suas informações de contato e identificação.
            </p>
            
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                Nome completo
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                />
              </label>
              
              <label className="block text-xs font-medium text-slate-600">
                E-mail
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                />
              </label>
              
              <label className="block text-xs font-medium text-slate-600">
                Perfil de acesso
                <input
                  type="text"
                  value={perfilAcesso}
                  disabled
                  className="mt-1 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 outline-none capitalize"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO: ALTERAR SENHA */}
      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-[#2563EB]">
            <Lock className="size-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[#0D1B4B]">Alterar senha</h2>
            <p className="mt-1 text-xs text-slate-500">
              Preencha os campos abaixo apenas se desejar modificar sua senha atual.
            </p>
            
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {/* CAMPO: SENHA ATUAL */}
              <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                Senha atual
                <div className="relative mt-1">
                  <input
                    type={mostrarSenhaAtual ? "text" : "password"}
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-10 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenhaAtual(!mostrarSenhaAtual)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {mostrarSenhaAtual ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>

              {/* CAMPO: NOVA SENHA */}
              <label className="block text-xs font-medium text-slate-600">
                Nova senha
                <div className="relative mt-1">
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-10 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {mostrarSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>
              
              {/* CAMPO: CONFIRMAR NOVA SENHA */}
              <label className="block text-xs font-medium text-slate-600">
                Confirmar nova senha
                <div className="relative mt-1">
                  <input
                    type={mostrarConfirmar ? "text" : "password"}
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-10 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {mostrarConfirmar ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={isSaving}
          onClick={handleSalvarPreferencias}
          className="rounded-xl bg-[#0D1B4B] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#152a6e] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Salvando...' : 'Salvar preferências'}
        </button>
      </div>
      
    </div>
  )
}