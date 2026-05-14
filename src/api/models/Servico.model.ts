import mongoose, { Schema, type Types } from "mongoose";

export interface IServico {
  _id: Types.ObjectId;
  nome: string;
  descricao: string;
  duracao_minutos: number;
  documentos_necessarios: string[];
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

const servicoSchema = new Schema<IServico>(
  {
    nome: { type: String, required: true, trim: true },
    descricao: { type: String, required: true, trim: true },
    duracao_minutos: { type: Number, required: true, min: 1 },
    documentos_necessarios: { type: [String], default: () => [] },
    ativo: { type: Boolean, required: true, default: true },
  },
  {
    collection: "servicos",
    timestamps: { createdAt: "criado_em", updatedAt: "atualizado_em" },
  }
);

const ServicoModel =
  (mongoose.models.Servico as mongoose.Model<IServico>) ??
  mongoose.model<IServico>("Servico", servicoSchema);

export default ServicoModel;
