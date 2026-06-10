import type { NextFunction, Request, Response } from "express";

import * as checkinService from "../../service/checkin.service.js";
import { success } from "../../utils/responseHelper.js";

function paramCodigo(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function executadoPor(req: Request) {
  return {
    tipo: "funcionario" as const,
    id: req.usuario!.id,
  };
}

export async function realizarCheckIn(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agendamento = await checkinService.realizarCheckIn(
      paramCodigo(req.params.codigo),
      executadoPor(req),
    );
    res.status(200).json(
      success({
        codigo_agendamento: agendamento.codigo_agendamento,
        status: agendamento.status,
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function marcarNaoCompareceu(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agendamento = await checkinService.marcarNaoCompareceu(
      paramCodigo(req.params.codigo),
      executadoPor(req),
    );
    res.status(200).json(
      success({
        codigo_agendamento: agendamento.codigo_agendamento,
        status: agendamento.status,
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function concluirAtendimento(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agendamento = await checkinService.concluirAtendimento(
      paramCodigo(req.params.codigo),
      executadoPor(req),
    );
    res.status(200).json(
      success({
        codigo_agendamento: agendamento.codigo_agendamento,
        status: agendamento.status,
      }),
    );
  } catch (error) {
    next(error);
  }
}
