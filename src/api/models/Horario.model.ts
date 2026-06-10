import mongoose, { Schema, type Types } from "mongoose";

export const HORARIO_STATUS = [
  "disponivel",
  "pre_reservado",
  "agendado",
  "bloqueado",
  "expirado",
] as const;

export type HorarioStatus = (typeof HORARIO_STATUS)[number];

export interface IPreReservaHorario {
  pre_reserva_id?: Types.ObjectId;
  conversa_id?: string;
  expira_em?: Date;
  criada_em?: Date;
}

export interface IHorario {
  _id: Types.ObjectId;
  funcionario_id: Types.ObjectId;
  servico_id: Types.ObjectId;
  inicio_em: Date;
  fim_em: Date;
  status: HorarioStatus;
  pre_reserva?: IPreReservaHorario | null;
  agendamento_id?: Types.ObjectId | null;
}

const preReservaSchema = new Schema<IPreReservaHorario>(
  {
    pre_reserva_id: { type: Schema.Types.ObjectId },
    conversa_id: { type: String, trim: true },
    expira_em: { type: Date },
    criada_em: { type: Date },
  },
  { _id: false }
);

const horarioSchema = new Schema<IHorario>(
  {
    funcionario_id: {
      type: Schema.Types.ObjectId,
      ref: "Funcionario",
      required: true,
    },
    servico_id: {
      type: Schema.Types.ObjectId,
      ref: "Servico",
      required: true,
    },
    inicio_em: { type: Date, required: true },
    fim_em: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: HORARIO_STATUS,
      default: "disponivel",
    },
    pre_reserva: { type: preReservaSchema, required: false },
    agendamento_id: {
      type: Schema.Types.ObjectId,
      ref: "Agendamento",
      default: null,
    },
  },
  { collection: "horarios" }
);

horarioSchema.index({ funcionario_id: 1, inicio_em: 1 });
horarioSchema.index({ servico_id: 1, inicio_em: 1 });
horarioSchema.index({ status: 1, inicio_em: 1 });
horarioSchema.index(
  { "pre_reserva.expira_em": 1 },
  { expireAfterSeconds: 0, sparse: true }
);

const HorarioModel =
  (mongoose.models.Horario as mongoose.Model<IHorario>) ??
  mongoose.model<IHorario>("Horario", horarioSchema);

export default HorarioModel;
