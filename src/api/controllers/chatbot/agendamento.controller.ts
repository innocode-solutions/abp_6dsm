import type { NextFunction, Request, Response } from "express";

import * as agendamentoService from "../../service/agendamento.service.js";
import { success } from "../../utils/responseHelper.js";
import {
  assertCamposObrigatorios,
  assertObjectId,
} from "../../utils/validationHelper.js";

function paramCodigo(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export async function criarAgendamento(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    assertCamposObrigatorios(req.body, [
      "horario_id",
      "pre_reserva_id",
      "conversa_id",
      "cidadao",
      "assunto",
      "descricao",
    ]);
    assertObjectId(String(req.body.horario_id), "horario_id");
    assertObjectId(String(req.body.pre_reserva_id), "pre_reserva_id");

    const cidadao = req.body.cidadao as Record<string, unknown>;
    assertCamposObrigatorios(cidadao, ["nome", "cpf"]);

    const agendamento = await agendamentoService.confirmarAgendamento({
      horario_id: String(req.body.horario_id),
      pre_reserva_id: String(req.body.pre_reserva_id),
      conversa_id: String(req.body.conversa_id),
      cidadao: {
        nome: String(cidadao.nome),
        cpf: String(cidadao.cpf),
      },
      assunto: String(req.body.assunto),
      descricao: String(req.body.descricao),
    });
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
    assertCamposObrigatorios(req.body, ["motivo", "conversa_id", "cancelado_por"]);

    const agendamento = await agendamentoService.cancelarAgendamento({
      codigo: paramCodigo(req.params.codigo),
      motivo: String(req.body.motivo),
      cancelado_por: req.body.cancelado_por,
      conversa_id: String(req.body.conversa_id),
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
    assertCamposObrigatorios(req.body, [
      "novo_horario_id",
      "pre_reserva_id",
      "conversa_id",
      "motivo",
    ]);
    assertObjectId(String(req.body.novo_horario_id), "novo_horario_id");
    assertObjectId(String(req.body.pre_reserva_id), "pre_reserva_id");

    const agendamento = await agendamentoService.remarcarAgendamento({
      codigo: paramCodigo(req.params.codigo),
      novo_horario_id: String(req.body.novo_horario_id),
      pre_reserva_id: String(req.body.pre_reserva_id),
      conversa_id: String(req.body.conversa_id),
      motivo: String(req.body.motivo),
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
