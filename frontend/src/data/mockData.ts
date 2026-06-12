/** Centralized mock data for the Procon Bot Jacareí admin panel */

export const REFERENCE_DATE = new Date(2025, 4, 24)

export const diasUltimos7 = ['18/05', '19/05', '20/05', '21/05', '22/05', '23/05', '24/05']

export const atendimentosPorDia = diasUltimos7.map((dia, i) => ({
  dia,
  atendimentos: [50, 110, 180, 155, 180, 120, 265][i]!,
}))

export const assuntosDonut = [
  { name: 'Reclamações', value: 35, color: '#0D1B4B' },
  { name: 'Produtos', value: 20, color: '#CC2229' },
  { name: 'Serviços', value: 18, color: '#2563EB' },
  { name: 'Cancelamento', value: 12, color: '#93C5FD' },
  { name: 'Outros', value: 15, color: '#9CA3AF' },
]

export const agendamentosStackedPorDia = diasUltimos7.map((dia, i) => ({
  dia,
  confirmados: [35, 42, 55, 48, 60, 38, 72][i]!,
  pendentes: [12, 18, 22, 20, 25, 15, 28][i]!,
  cancelados: [3, 4, 5, 4, 6, 3, 5][i]!,
}))

export const dashboardMetricas = [
  {
    id: 'conversas',
    titulo: 'Conversas hoje',
    valor: '256',
    tendencia: '↑ 12% vs ontem',
    tendenciaPositiva: true,
  },
  {
    id: 'usuarios',
    titulo: 'Usuários únicos hoje',
    valor: '148',
    tendencia: '↑ 8% vs ontem',
    tendenciaPositiva: true,
  },
  {
    id: 'mensagens',
    titulo: 'Mensagens recebidas hoje',
    valor: '842',
    tendencia: '↑ 15% vs ontem',
    tendenciaPositiva: true,
  },
  {
    id: 'agendamentos',
    titulo: 'Agendamentos futuros',
    valor: '67',
    tendencia: '↑ 5% vs ontem',
    tendenciaPositiva: true,
  },
]

export type StatusConversa = 'Ativo' | 'Pendente' | 'Resolvido' | 'Atenção'

export interface ConversaRow {
  id: string
  nome: string
  iniciais: string
  identificador: string
  ultimaMensagem: string
  dataHoraLabel: string
  status: StatusConversa
  assunto: string
}

export const conversasMock: ConversaRow[] = [
  {
    id: '1',
    nome: 'Maria José Silva',
    iniciais: 'MJ',
    identificador: 'CPF ***456.789-**',
    ultimaMensagem:
      'Gostaria de saber o status da minha reclamação sobre...',
    dataHoraLabel: 'Hoje, 14:32',
    status: 'Ativo',
    assunto: 'Reclamação',
  },
  {
    id: '2',
    nome: 'Antonio Santos',
    iniciais: 'AS',
    identificador: 'Protocolo 20250524-12A',
    ultimaMensagem: 'Certo, aguardarei o retorno por e-mail.',
    dataHoraLabel: 'Hoje, 11:15',
    status: 'Pendente',
    assunto: 'Dúvida',
  },
  {
    id: '3',
    nome: 'Carlos Roberto',
    iniciais: 'CR',
    identificador: 'Tel (12) 9****-1234',
    ultimaMensagem: 'Preciso agendar um horário para amanhã à tarde.',
    dataHoraLabel: 'Ontem, 16:45',
    status: 'Resolvido',
    assunto: 'Agendamento',
  },
  {
    id: '4',
    nome: 'Ana Paula Oliveira',
    iniciais: 'AO',
    identificador: 'Protocolo 20250523-89C',
    ultimaMensagem: 'Não entendi a resposta, pode explicar novamente?',
    dataHoraLabel: 'Ontem, 10:20',
    status: 'Atenção',
    assunto: 'Outros',
  },
]

export const conversasTotalResultados = 256

export type StatusAgendamento = 'Confirmado' | 'Pendente' | 'Cancelado'

export interface AgendamentoRow {
  id: string
  nome: string
  iniciais: string
  cpfMascarado: string
  tipoServico: string
  descricao: string
  horario: string
  status: StatusAgendamento
}

export const agendamentosMetricas = {
  total: { valor: 342, sub: '↑ 12% vs mês anterior', positivo: true },
  confirmados: { valor: 280, sub: '81% do total' },
  pendentes: { valor: 45, sub: '13% do total' },
  cancelados: { valor: 17, sub: '↓ 2% vs mês anterior', positivo: false },
}

/** Days in May 2025 (1-indexed) that have at least one appointment */
export const diasComAgendamentoMaio2025 = new Set([
  3, 7, 10, 14, 18, 21, 22, 24, 27, 29,
])

export const agendamentosListaMock: AgendamentoRow[] = [
  {
    id: 'a1',
    nome: 'Ana Souza',
    iniciais: 'AS',
    cpfMascarado: '***.***.123-45',
    tipoServico: 'Reclamação - Telefonia',
    descricao: 'Cobrança indevida em fatura',
    horario: '09:00 - 09:30',
    status: 'Confirmado',
  },
  {
    id: 'a2',
    nome: 'Carlos Mendes',
    iniciais: 'CM',
    cpfMascarado: '***.***.987-65',
    tipoServico: 'Atendimento presencial',
    descricao: 'Orientação sobre direito de arrependimento',
    horario: '10:00 - 10:30',
    status: 'Pendente',
  },
  {
    id: 'a3',
    nome: 'Fernanda Lima',
    iniciais: 'FL',
    cpfMascarado: '***.***.456-78',
    tipoServico: 'Mediação',
    descricao: 'Disputa com fornecedor de serviços',
    horario: '11:00 - 11:45',
    status: 'Confirmado',
  },
  {
    id: 'a4',
    nome: 'Ricardo Alves',
    iniciais: 'RA',
    cpfMascarado: '***.***.321-09',
    tipoServico: 'Reclamação - E-commerce',
    descricao: 'Produto com defeito — troca',
    horario: '14:00 - 14:30',
    status: 'Cancelado',
  },
  {
    id: 'a5',
    nome: 'Juliana Costa',
    iniciais: 'JC',
    cpfMascarado: '***.***.654-32',
    tipoServico: 'Agendamento',
    descricao: 'Consulta sobre garantia estendida',
    horario: '15:30 - 16:00',
    status: 'Pendente',
  },
]

export type PapelUsuario = 'Administrador' | 'Editor' | 'Visualizador'

export interface UsuarioAdmin {
  id: string
  nome: string
  email: string
  papel: PapelUsuario
  ativo: boolean
  iniciais: string
  avatarClass: string
}

export const usuariosMock: UsuarioAdmin[] = [
  {
    id: 'u1',
    nome: 'João Silva',
    email: 'joao.silva@procon.jacarei.sp.gov.br',
    papel: 'Administrador',
    ativo: true,
    iniciais: 'JS',
    avatarClass: 'bg-[#0D1B4B] text-white',
  },
  {
    id: 'u2',
    nome: 'Maria Oliveira',
    email: 'maria.oliveira@procon.jacarei.sp.gov.br',
    papel: 'Editor',
    ativo: true,
    iniciais: 'MO',
    avatarClass: 'bg-[#2563EB] text-white',
  },
  {
    id: 'u3',
    nome: 'Carlos Pereira',
    email: 'carlos.pereira@procon.jacarei.sp.gov.br',
    papel: 'Visualizador',
    ativo: false,
    iniciais: 'CP',
    avatarClass: 'bg-gray-300 text-gray-700',
  },
]

export interface BaseConhecimentoItem {
  id: string
  titulo: string
  categoria: string
  atualizadoEm: string
  trechos: number
}

export const baseConhecimentoMock: BaseConhecimentoItem[] = [
  {
    id: 'k1',
    titulo: 'Direito de arrependimento (CDC)',
    categoria: 'Consumidor',
    atualizadoEm: '22/05/2025',
    trechos: 12,
  },
  {
    id: 'k2',
    titulo: 'Garantia legal vs garantia estendida',
    categoria: 'Produtos',
    atualizadoEm: '20/05/2025',
    trechos: 8,
  },
  {
    id: 'k3',
    titulo: 'Como abrir reclamação no Procon',
    categoria: 'Procedimentos',
    atualizadoEm: '18/05/2025',
    trechos: 15,
  },
  {
    id: 'k4',
    titulo: 'Média e conciliação — passo a passo',
    categoria: 'Mediação',
    atualizadoEm: '15/05/2025',
    trechos: 6,
  },
]
