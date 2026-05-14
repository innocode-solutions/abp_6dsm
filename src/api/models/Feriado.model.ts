import mongoose, { Schema, type Types } from "mongoose";

export const FERIADO_TIPOS = ["nacional", "estadual", "municipal"] as const;

export type FeriadoTipo = (typeof FERIADO_TIPOS)[number];

const DATA_YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

export interface IFeriado {
  _id: Types.ObjectId;
  data: string;
  nome: string;
  tipo: FeriadoTipo;
  bloqueia_agendamento: boolean;
}

const feriadoSchema = new Schema<IFeriado>(
  {
    data: {
      type: String,
      required: true,
      trim: true,
      match: DATA_YYYY_MM_DD,
    },
    nome: { type: String, required: true, trim: true },
    tipo: {
      type: String,
      required: true,
      enum: FERIADO_TIPOS,
    },
    bloqueia_agendamento: { type: Boolean, required: true, default: true },
  },
  { collection: "feriados" }
);

const FeriadoModel =
  (mongoose.models.Feriado as mongoose.Model<IFeriado>) ??
  mongoose.model<IFeriado>("Feriado", feriadoSchema);

export default FeriadoModel;
