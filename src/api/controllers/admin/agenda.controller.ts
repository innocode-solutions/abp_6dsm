import type { NextFunction, Request, Response } from "express";

import { AGENDAMENTO_STATUS, type AgendamentoStatus } from "../../models/Agendamento.model.js";
import * as agendaService from "../../service/agenda.service.js";
import { success } from "../../utils/responseHelper.js";

function queryString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseStatus(value: string | undefined): AgendamentoStatus | undefined {
  if (!value) {
    return undefined;
  }
  return (AGENDAMENTO_STATUS as readonly string[]).includes(value)
    ? (value as AgendamentoStatus)
    : undefined;
}

export async function listarAgenda(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dataRaw = queryString(req.query.data);
    const data = dataRaw ? agendaService.parseDataAgenda(dataRaw) : undefined;
    const status = parseStatus(queryString(req.query.status));
    const funcionario_id = queryString(req.query.funcionario_id);

    const agendamentos = await agendaService.listarAgenda({
      data,
      status,
      funcionario_id,
    });

    res.status(200).json(success(agendamentos));
  } catch (error) {
    next(error);
  }
}
