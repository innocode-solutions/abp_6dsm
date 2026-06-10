import mongoose, { Schema, type Types } from "mongoose";

export interface IBloqueio {
  _id: Types.ObjectId;
  funcionario_id: Types.ObjectId;
  inicio_em: Date;
  fim_em: Date;
  motivo: string;
  criado_por: Types.ObjectId;
}

const bloqueioSchema = new Schema<IBloqueio>(
  {
    funcionario_id: {
      type: Schema.Types.ObjectId,
      ref: "Funcionario",
      required: true,
    },
    inicio_em: { type: Date, required: true },
    fim_em: { type: Date, required: true },
    motivo: { type: String, required: true, trim: true },
    criado_por: {
      type: Schema.Types.ObjectId,
      ref: "Funcionario",
      required: true,
    },
  },
  { collection: "bloqueios" }
);

const BloqueioModel =
  (mongoose.models.Bloqueio as mongoose.Model<IBloqueio>) ??
  mongoose.model<IBloqueio>("Bloqueio", bloqueioSchema);

export default BloqueioModel;
