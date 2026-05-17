import type { NextFunction, Request, Response } from "express";

import * as agendamentoService from "../../service/agendamento.service.js";
import { success } from "../../utils/responseHelper.js";

function paramCodigo(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export async function criarAgendamento(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agendamento = await agendamentoService.confirmarAgendamento(req.body);
    res.status(201).json(
      success({
        codigo_agendamento: agendamento.codigo_agendamento,
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function consultarAgendamento(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agendamento = await agendamentoService.consultarAgendamento(
      paramCodigo(req.params.codigo),
    );
    res.status(200).json(success(agendamento));
  } catch (error) {
    next(error);
  }
}

export async function cancelarAgendamento(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agendamento = await agendamentoService.cancelarAgendamento({
      codigo: paramCodigo(req.params.codigo),
      motivo: req.body.motivo,
      cancelado_por: req.body.cancelado_por,
      conversa_id: req.body.conversa_id,
    });
    res.status(200).json(success(agendamento));
  } catch (error) {
    next(error);
  }
}

export async function remarcarAgendamento(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agendamento = await agendamentoService.remarcarAgendamento({
      codigo: paramCodigo(req.params.codigo),
      novo_horario_id: req.body.novo_horario_id,
      conversa_id: req.body.conversa_id,
      motivo: req.body.motivo,
    });
    res.status(200).json(
      success({
        codigo_agendamento: agendamento.codigo_agendamento,
      }),
    );
  } catch (error) {
    next(error);
  }
}
