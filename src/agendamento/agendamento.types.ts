export interface ApiEnvelope<T> {
  dados: T;
  meta?: {
    requisicao_id: string;
    timestamp: string;
  };
}

export interface AgendamentoApiErrorBody {
  erro?: {
    codigo?: string;
    mensagem?: string;
  };
}

export interface AgendamentoServico {
  _id: string;
  nome: string;
  descricao?: string;
  duracao_minutos?: number;
  documentos_necessarios?: string[];
}

export interface AgendamentoHorario {
  _id: string;
  funcionario_id?: string;
  servico_id: string;
  inicio_em?: string | Date;
  fim_em?: string | Date;
  status?: string;
  exibicao?: {
    data: string;
    hora: string;
    dia_semana?: string;
  };
}

export interface CriarPreReservaInput {
  horario_id: string;
  conversa_id: string;
  origem: "whatsapp";
  minutos_pre_reserva: number;
}

export interface CriarPreReservaResponse {
  pre_reserva_id: string;
  horario_id: string;
}

export interface ConfirmarAgendamentoInput {
  horario_id: string;
  pre_reserva_id: string;
  conversa_id: string;
  cidadao: {
    nome: string;
    cpf: string;
  };
  assunto: string;
  descricao: string;
}

export interface CodigoAgendamentoResponse {
  codigo_agendamento: string;
}

export interface CancelarAgendamentoInput {
  motivo: string;
  conversa_id: string;
  cancelado_por: {
    tipo: "sistema";
    id: string;
  };
}

export interface RemarcarAgendamentoInput {
  novo_horario_id: string;
  conversa_id: string;
  motivo: string;
}

export interface AgendamentoApi {
  listarServicos(): Promise<AgendamentoServico[]>;
  listarHorariosDisponiveis(input: {
    servico_id: string;
    limite?: number;
    de?: string;
    ate?: string;
  }): Promise<AgendamentoHorario[]>;
  criarPreReserva(input: CriarPreReservaInput): Promise<CriarPreReservaResponse>;
  confirmarAgendamento(input: ConfirmarAgendamentoInput): Promise<CodigoAgendamentoResponse>;
  consultarAgendamento(codigo: string): Promise<unknown>;
  cancelarAgendamento(codigo: string, input: CancelarAgendamentoInput): Promise<unknown>;
  remarcarAgendamento(
    codigo: string,
    input: RemarcarAgendamentoInput
  ): Promise<CodigoAgendamentoResponse>;
}

export type EtapaAgendamento =
  | "oferta_agendamento"
  | "confirmar_agendamento_presencial"
  | "escolher_servico"
  | "escolher_horario"
  | "informar_nome"
  | "informar_cpf"
  | "informar_assunto"
  | "informar_descricao";

export interface AgendamentoConversationSession {
  userId: string;
  etapa: EtapaAgendamento;
  servicos?: AgendamentoServico[];
  horarios?: AgendamentoHorario[];
  servico_id?: string;
  horario_id?: string;
  pre_reserva_id?: string;
  nome?: string;
  cpf?: string;
  assunto?: string;
}

export interface AgendamentoConversationOptions {
  allowStart?: boolean;
}

export interface AgendamentoConversationHandler {
  handle(
    userId: string,
    body: string,
    options?: AgendamentoConversationOptions
  ): Promise<string | null>;
  offerScheduling?(userId: string): Promise<string | null>;
}
