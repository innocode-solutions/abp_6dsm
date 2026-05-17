import mongoose, { type Types } from "mongoose";

import HorarioModel, { type IHorario } from "../models/Horario.model.js";
import { AppError } from "../types/common.types.js";

export interface CriarPreReservaInput {
  horario_id: string | Types.ObjectId;
  conversa_id: string;
  origem: string;
  minutos_pre_reserva: number;
}

export interface CriarPreReservaResultado {
  horario: IHorario;
  pre_reserva_id: Types.ObjectId;
}

function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
}

export async function criarPreReserva({
  horario_id,
  conversa_id,
  minutos_pre_reserva,
}: CriarPreReservaInput): Promise<CriarPreReservaResultado> {
  const pre_reserva_id = new mongoose.Types.ObjectId();
  const criada_em = new Date();
  const expira_em = new Date(criada_em.getTime() + minutos_pre_reserva * 60_000);

  const horario = await HorarioModel.findOneAndUpdate(
    {
      _id: toObjectId(horario_id),
      status: "disponivel",
    },
    {
      $set: {
        status: "pre_reservado",
        pre_reserva: {
          pre_reserva_id,
          conversa_id,
          expira_em,
          criada_em,
        },
      },
    },
    { new: true },
  );

  if (!horario) {
    throw new AppError("HORARIO_INDISPONIVEL", 409);
  }

  return { horario, pre_reserva_id };
}
