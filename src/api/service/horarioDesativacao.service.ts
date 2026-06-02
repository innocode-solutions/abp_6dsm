import mongoose, { type Types } from "mongoose";

import HorarioModel from "../models/Horario.model.js";

function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
}

async function bloquearHorariosFuturos(filtro: Record<string, unknown>): Promise<number> {
  const agora = new Date();
  const resultado = await HorarioModel.updateMany(
    {
      ...filtro,
      inicio_em: { $gte: agora },
      status: { $in: ["disponivel", "pre_reservado"] },
    },
    {
      $set: {
        status: "bloqueado",
        pre_reserva: null,
      },
    },
  );

  return resultado.modifiedCount;
}

export async function bloquearHorariosFuturosPorFuncionario(
  funcionario_id: string | Types.ObjectId,
): Promise<number> {
  return bloquearHorariosFuturos({ funcionario_id: toObjectId(funcionario_id) });
}

export async function bloquearHorariosFuturosPorServico(
  servico_id: string | Types.ObjectId,
): Promise<number> {
  return bloquearHorariosFuturos({ servico_id: toObjectId(servico_id) });
}
