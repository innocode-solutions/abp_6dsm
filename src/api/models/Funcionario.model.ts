import mongoose, { Schema, type Types } from "mongoose";

export const FUNCIONARIO_PERFIS = ["admin", "atendente"] as const;

export type FuncionarioPerfil = (typeof FUNCIONARIO_PERFIS)[number];

export interface IFuncionario {
  _id: Types.ObjectId;
  nome: string;
  email: string;
  senha_hash: string;
  perfil: FuncionarioPerfil;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

const funcionarioSchema = new Schema<IFuncionario>(
  {
    nome: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    senha_hash: { type: String, required: true, select: false },
    perfil: {
      type: String,
      required: true,
      enum: FUNCIONARIO_PERFIS,
    },
    ativo: { type: Boolean, required: true, default: true },
  },
  {
    collection: "funcionarios",
    timestamps: { createdAt: "criado_em", updatedAt: "atualizado_em" },
  }
);

const FuncionarioModel =
  (mongoose.models.Funcionario as mongoose.Model<IFuncionario>) ??
  mongoose.model<IFuncionario>("Funcionario", funcionarioSchema);

export default FuncionarioModel;
