import type { NextFunction, Request, Response } from "express";

import * as agendamentoService from "../../service/agendamento.service.js";
import * as preReservaService from "../../service/preReserva.service.js";
import { success } from "../../utils/responseHelper.js";
import {
  assertCamposObrigatorios,
  assertObjectId,
} from "../../utils/validationHelper.js";

const MINUTOS_PRE_RESERVA_ADMIN = 15;

function paramCodigo(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export async function criarAgendamentoAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    assertCamposObrigatorios(req.body, [
      "horario_id",
      "cidadao",
      "assunto",
      "descricao",
    ]);
    assertObjectId(String(req.body.horario_id), "horario_id");

    const cidadao = req.body.cidadao as Record<string, unknown>;
    assertCamposObrigatorios(cidadao, ["nome", "cpf"]);

    const conversaId = `admin-${req.usuario!.id}-${Date.now()}`;
    const preReserva = await preReservaService.criarPreReserva({
      horario_id: String(req.body.horario_id),
      conversa_id: conversaId,
      origem: "admin",
      minutos_pre_reserva: MINUTOS_PRE_RESERVA_ADMIN,
    });

    const agendamento = await agendamentoService.confirmarAgendamento({
      horario_id: preReserva.horario._id,
      pre_reserva_id: preReserva.pre_reserva_id,
      conversa_id: conversaId,
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
        status: agendamento.status,
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function cancelarAgendamentoAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    assertCamposObrigatorios(req.body, ["motivo"]);

    const agendamento = await agendamentoService.cancelarAgendamentoAdmin({
      codigo: paramCodigo(req.params.codigo),
      motivo: String(req.body.motivo),
      cancelado_por: {
        tipo: "funcionario",
        id: req.usuario!.id,
      },
    });

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
