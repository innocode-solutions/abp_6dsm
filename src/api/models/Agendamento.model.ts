import mongoose, { Schema, type Types } from "mongoose";

/**
 * Status completos do ciclo de vida do agendamento (spec de domínio).
 * O índice único parcial em `horario_id` aplica-se a: pendente, confirmado, check_in_realizado.
 */
export const AGENDAMENTO_STATUS = [
  "pendente",
  "confirmado",
  "cancelado",
  "expirado",
  "check_in_realizado",
  "em_atendimento",
  "concluido",
  "nao_compareceu",
  "reagendado",
] as const;

export type AgendamentoStatus = (typeof AGENDAMENTO_STATUS)[number];

export const AGENDAMENTO_ORIGENS = ["whatsapp"] as const;

export type AgendamentoOrigem = (typeof AGENDAMENTO_ORIGENS)[number];

export const CALENDARIO_EXTERNO_STATUS_SINCRONIZACAO = [
  "pendente",
  "sincronizado",
  "atualizado",
  "cancelado",
  "falhou",
] as const;

export type CalendarioExternoStatusSincronizacao =
  (typeof CALENDARIO_EXTERNO_STATUS_SINCRONIZACAO)[number];

export interface IAgendamentoCidadao {
  nome: string;
  cpf: string;
}

export interface IAgendamentoCalendarioExterno {
  provedor: string;
  evento_id: string;
  status_sincronizacao: CalendarioExternoStatusSincronizacao;
}

export interface IAgendamento {
  _id: Types.ObjectId;
  codigo_agendamento: string;
  cidadao: IAgendamentoCidadao;
  servico_id: Types.ObjectId;
  funcionario_id: Types.ObjectId;
  horario_id: Types.ObjectId;
  status: AgendamentoStatus;
  inicio_em: Date;
  fim_em: Date;
  assunto: string;
  descricao: string;
  origem: AgendamentoOrigem;
  conversa_id: string;
  calendario_externo?: IAgendamentoCalendarioExterno | null;
}

const cidadaoSchema = new Schema<IAgendamentoCidadao>(
  {
    nome: { type: String, required: true, trim: true },
    cpf: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const calendarioExternoSchema = new Schema<IAgendamentoCalendarioExterno>(
  {
    provedor: { type: String, required: true, trim: true },
    evento_id: { type: String, required: true, trim: true },
    status_sincronizacao: {
      type: String,
      required: true,
      enum: CALENDARIO_EXTERNO_STATUS_SINCRONIZACAO,
      default: "pendente",
    },
  },
  { _id: false }
);

const agendamentoSchema = new Schema<IAgendamento>(
  {
    codigo_agendamento: { type: String, required: true, trim: true },
    cidadao: { type: cidadaoSchema, required: true },
    servico_id: {
      type: Schema.Types.ObjectId,
      ref: "Servico",
      required: true,
    },
    funcionario_id: {
      type: Schema.Types.ObjectId,
      ref: "Funcionario",
      required: true,
    },
    horario_id: {
      type: Schema.Types.ObjectId,
      ref: "Horario",
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: AGENDAMENTO_STATUS,
    },
    inicio_em: { type: Date, required: true },
    fim_em: { type: Date, required: true },
    assunto: { type: String, required: true, trim: true },
    descricao: { type: String, required: true, trim: true },
    origem: {
      type: String,
      required: true,
      enum: AGENDAMENTO_ORIGENS,
    },
    conversa_id: { type: String, required: true, trim: true },
    calendario_externo: {
      type: calendarioExternoSchema,
      default: undefined,
    },
  },
  { collection: "agendamentos" }
);

agendamentoSchema.index({ codigo_agendamento: 1 }, { unique: true });
agendamentoSchema.index({ "cidadao.cpf": 1, inicio_em: 1 });
agendamentoSchema.index({ status: 1, inicio_em: 1 });
agendamentoSchema.index({ funcionario_id: 1, inicio_em: 1 });
agendamentoSchema.index({ conversa_id: 1 });
agendamentoSchema.index(
  { horario_id: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["pendente", "confirmado", "check_in_realizado"] },
    },
  }
);

const AgendamentoModel =
  (mongoose.models.Agendamento as mongoose.Model<IAgendamento>) ??
  mongoose.model<IAgendamento>("Agendamento", agendamentoSchema);

export default AgendamentoModel;
