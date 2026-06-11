import type { NextFunction, Request, Response } from "express";
import { fromZonedTime } from "date-fns-tz";

import { HORARIO_STATUS, type HorarioStatus } from "../../models/Horario.model.js";
import * as horarioService from "../../service/horario.service.js";
import { success } from "../../utils/responseHelper.js";

const TIMEZONE_BR = "America/Sao_Paulo";
const DATA_YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

function queryString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseDataAdmin(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  if (DATA_YYYY_MM_DD.test(value)) {
    const parsed = fromZonedTime(`${value}T00:00:00`, TIMEZONE_BR);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
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
      de: parseDataAdmin(deRaw),
      ate: parseDataAdmin(ateRaw),
    });

    res.status(200).json(success(horarios));
  } catch (error) {
    next(error);
  }
}
