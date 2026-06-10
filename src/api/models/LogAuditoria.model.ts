import mongoose, { Schema, type Types } from "mongoose";

export const LOG_AUDITORIA_EXECUTOR_TIPOS = [
  "funcionario",
  "sistema",
  "integracao",
] as const;

export type LogAuditoriaExecutorTipo = (typeof LOG_AUDITORIA_EXECUTOR_TIPOS)[number];

export interface ILogAuditoriaExecutadoPor {
  tipo: LogAuditoriaExecutorTipo;
  id: string;
}

export interface ILogAuditoria {
  _id: Types.ObjectId;
  entidade: string;
  entidade_id: string;
  acao: string;
  executado_por: ILogAuditoriaExecutadoPor;
  dados_anteriores?: unknown;
  dados_novos?: unknown;
  criado_em: Date;
}

const executadoPorSchema = new Schema<ILogAuditoriaExecutadoPor>(
  {
    tipo: {
      type: String,
      required: true,
      enum: LOG_AUDITORIA_EXECUTOR_TIPOS,
    },
    id: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const logAuditoriaSchema = new Schema<ILogAuditoria>(
  {
    entidade: { type: String, required: true, trim: true },
    entidade_id: { type: String, required: true, trim: true },
    acao: { type: String, required: true, trim: true },
    executado_por: { type: executadoPorSchema, required: true },
    dados_anteriores: { type: Schema.Types.Mixed, default: undefined },
    dados_novos: { type: Schema.Types.Mixed, default: undefined },
    criado_em: { type: Date, required: true, default: () => new Date() },
  },
  { collection: "logs_auditoria" }
);

const LogAuditoriaModel =
  (mongoose.models.LogAuditoria as mongoose.Model<ILogAuditoria>) ??
  mongoose.model<ILogAuditoria>("LogAuditoria", logAuditoriaSchema);

export default LogAuditoriaModel;
