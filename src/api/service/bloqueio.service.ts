import mongoose, { type Types } from "mongoose";

import BloqueioModel, { type IBloqueio } from "../models/Bloqueio.model.js";
import HorarioModel from "../models/Horario.model.js";
import { AppError } from "../types/common.types.js";

function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
}

export interface CriarBloqueioInput {
  funcionario_id: string | Types.ObjectId;
  inicio_em: Date;
  fim_em: Date;
  motivo: string;
  criado_por: string | Types.ObjectId;
}

export interface CriarBloqueioResultado {
  bloqueio_id: string;
  horarios_afetados: number;
}

export async function criarBloqueio(dados: CriarBloqueioInput): Promise<CriarBloqueioResultado> {
  if (dados.fim_em.getTime() <= dados.inicio_em.getTime()) {
    throw new AppError("INTERVALO_INVALIDO", 400);
  }

  const funcionario_id = toObjectId(dados.funcionario_id);
  const criado_por = toObjectId(dados.criado_por);

  const bloqueio = await BloqueioModel.create({
    funcionario_id,
    inicio_em: dados.inicio_em,
    fim_em: dados.fim_em,
    motivo: dados.motivo.trim(),
    criado_por,
  });

  const resultado = await HorarioModel.updateMany(
    {
      funcionario_id,
      inicio_em: { $gte: dados.inicio_em, $lt: dados.fim_em },
      status: { $in: ["disponivel", "pre_reservado"] },
    },
    { $set: { status: "bloqueado" } },
  );

  return {
    bloqueio_id: bloqueio._id.toString(),
    horarios_afetados: resultado.modifiedCount,
  };
}

export interface RemoverBloqueioResultado {
  bloqueio_id: string;
  horarios_liberados: number;
}

export async function removerBloqueio(
  bloqueio_id: string | Types.ObjectId,
): Promise<RemoverBloqueioResultado> {
  const id = toObjectId(bloqueio_id);
  const bloqueio: IBloqueio | null = await BloqueioModel.findByIdAndDelete(id).lean();

  if (!bloqueio) {
    throw new AppError("BLOQUEIO_NAO_ENCONTRADO", 404);
  }

  const resultado = await HorarioModel.updateMany(
    {
      funcionario_id: bloqueio.funcionario_id,
      inicio_em: { $gte: bloqueio.inicio_em, $lt: bloqueio.fim_em },
      status: "bloqueado",
      $or: [{ agendamento_id: null }, { agendamento_id: { $exists: false } }],
    },
    { $set: { status: "disponivel" } },
  );

  return {
    bloqueio_id: bloqueio._id.toString(),
    horarios_liberados: resultado.modifiedCount,
  };
}
