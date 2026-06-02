import type { NextFunction, Request, Response } from "express";

import { HORARIO_STATUS, type HorarioStatus } from "../../models/Horario.model.js";
import * as horarioService from "../../service/horario.service.js";
import { success } from "../../utils/responseHelper.js";

function queryString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseStatus(value: string | undefined): HorarioStatus | undefined {
  if (!value) {
    return undefined;
  }
  return (HORARIO_STATUS as readonly string[]).includes(value)
    ? (value as HorarioStatus)
    : undefined;
}

export async function gerarHorarios(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const de = new Date(req.body.de);
    const ate = new Date(req.body.ate);
    const resultado = await horarioService.gerarHorarios(de, ate, req.usuario!.id);
    res.status(201).json(success(resultado));
  } catch (error) {
    next(error);
  }
}

export async function listarHorariosAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const deRaw = queryString(req.query.de);
    const ateRaw = queryString(req.query.ate);

    const horarios = await horarioService.listarHorariosAdmin({
      funcionario_id: queryString(req.query.funcionario_id),
      servico_id: queryString(req.query.servico_id),
      status: parseStatus(queryString(req.query.status)),
      de: deRaw ? new Date(deRaw) : undefined,
      ate: ateRaw ? new Date(ateRaw) : undefined,
    });

    res.status(200).json(success(horarios));
  } catch (error) {
    next(error);
  }
}
