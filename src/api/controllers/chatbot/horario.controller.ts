import type { NextFunction, Request, Response } from "express";

import * as horarioService from "../../service/horario.service.js";
import { success } from "../../utils/responseHelper.js";
import { assertObjectId } from "../../utils/validationHelper.js";

function queryString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function queryNumber(value: unknown): number | undefined {
  const raw = queryString(value);
  if (raw === undefined) {
    return undefined;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function listarHorariosDisponiveis(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const servico_id = queryString(req.query.servico_id) ?? "";
    assertObjectId(servico_id, "servico_id");

    const deRaw = queryString(req.query.de);
    const ateRaw = queryString(req.query.ate);
    const de = deRaw ? new Date(deRaw) : undefined;
    const ate = ateRaw ? new Date(ateRaw) : undefined;
    const limite = queryNumber(req.query.limite);

    const horarios = await horarioService.getHorariosDisponiveis(
      servico_id,
      de,
      ate,
      limite,
    );
    res.status(200).json(success(horarios));
  } catch (error) {
    next(error);
  }
}
