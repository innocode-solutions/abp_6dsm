import type { NextFunction, Request, Response } from "express";

import * as preReservaService from "../../service/preReserva.service.js";
import { success } from "../../utils/responseHelper.js";
import {
  assertCamposObrigatorios,
  assertNumeroPositivo,
  assertObjectId,
} from "../../utils/validationHelper.js";

export async function criarPreReserva(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    assertCamposObrigatorios(req.body, [
      "horario_id",
      "conversa_id",
      "minutos_pre_reserva",
    ]);
    assertObjectId(String(req.body.horario_id), "horario_id");

    const minutos_pre_reserva = assertNumeroPositivo(
      req.body.minutos_pre_reserva,
      "minutos_pre_reserva",
    );

    const resultado = await preReservaService.criarPreReserva({
      horario_id: String(req.body.horario_id),
      conversa_id: String(req.body.conversa_id),
      origem: String(req.body.origem ?? "whatsapp"),
      minutos_pre_reserva,
    });
    res.status(200).json(
      success({
        pre_reserva_id: resultado.pre_reserva_id.toString(),
        horario_id: resultado.horario._id.toString(),
      }),
    );
  } catch (error) {
    next(error);
  }
}
