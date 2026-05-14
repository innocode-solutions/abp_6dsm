import mongoose, { Schema, type Types } from "mongoose";

export interface IRegraDisponibilidade {
  _id: Types.ObjectId;
  funcionario_id: Types.ObjectId;
  servico_id: Types.ObjectId;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  duracao_horario_minutos: number;
  ativo: boolean;
}

const regraDisponibilidadeSchema = new Schema<IRegraDisponibilidade>(
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
    dia_semana: { type: Number, required: true, min: 0, max: 6 },
    hora_inicio: { type: String, required: true, trim: true },
    hora_fim: { type: String, required: true, trim: true },
    duracao_horario_minutos: { type: Number, required: true, min: 1 },
    ativo: { type: Boolean, required: true, default: true },
  },
  { collection: "regras_disponibilidade" }
);

const RegraDisponibilidadeModel =
  (mongoose.models.RegraDisponibilidade as mongoose.Model<IRegraDisponibilidade>) ??
  mongoose.model<IRegraDisponibilidade>(
    "RegraDisponibilidade",
    regraDisponibilidadeSchema
  );

export default RegraDisponibilidadeModel;
