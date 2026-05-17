import type { NextFunction, Request, Response } from "express";

import * as preReservaService from "../../service/preReserva.service.js";
import { success } from "../../utils/responseHelper.js";

export async function criarPreReserva(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const resultado = await preReservaService.criarPreReserva(req.body);
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
