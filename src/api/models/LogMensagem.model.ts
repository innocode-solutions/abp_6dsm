import mongoose, { Schema, type Types } from "mongoose";

export const LOG_MENSAGEM_STATUS_ENVIO = [
  "enviado",
  "falhou",
  "pendente",
] as const;

export type LogMensagemStatusEnvio = (typeof LOG_MENSAGEM_STATUS_ENVIO)[number];

export interface ILogMensagem {
  _id: Types.ObjectId;
  agendamento_id?: Types.ObjectId | null;
  conversa_id: string;
  canal: string;
  tipo: string;
  destinatario: string;
  conteudo: string;
  status_envio: LogMensagemStatusEnvio;
  enviado_em?: Date | null;
  criado_em: Date;
}

const logMensagemSchema = new Schema<ILogMensagem>(
  {
    agendamento_id: {
      type: Schema.Types.ObjectId,
      ref: "Agendamento",
      default: null,
    },
    conversa_id: { type: String, required: true, trim: true },
    canal: { type: String, required: true, trim: true },
    tipo: { type: String, required: true, trim: true },
    destinatario: { type: String, required: true, trim: true },
    conteudo: { type: String, required: true },
    status_envio: {
      type: String,
      required: true,
      enum: LOG_MENSAGEM_STATUS_ENVIO,
      default: "pendente",
    },
    enviado_em: { type: Date, default: null },
    criado_em: { type: Date, required: true, default: () => new Date() },
  },
  { collection: "logs_mensagem" }
);

const LogMensagemModel =
  (mongoose.models.LogMensagem as mongoose.Model<ILogMensagem>) ??
  mongoose.model<ILogMensagem>("LogMensagem", logMensagemSchema);

export default LogMensagemModel;
