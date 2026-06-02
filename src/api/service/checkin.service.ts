import type { HydratedDocument } from "mongoose";

import AgendamentoModel, { type IAgendamento } from "../models/Agendamento.model.js";
import HorarioModel from "../models/Horario.model.js";
import type { ILogAuditoriaExecutadoPor } from "../models/LogAuditoria.model.js";
import { AppError } from "../types/common.types.js";
import { registrarAuditoria } from "./auditoria.service.js";

async function buscarAgendamento(codigo: string): Promise<HydratedDocument<IAgendamento>> {
  const agendamento = await AgendamentoModel.findOne({ codigo_agendamento: codigo });
  if (!agendamento) {
    throw new AppError("AGENDAMENTO_NAO_ENCONTRADO", 404);
  }
  return agendamento;
}

async function liberarHorario(horario_id: IAgendamento["horario_id"]): Promise<void> {
  await HorarioModel.updateOne(
    { _id: horario_id },
    {
      $set: {
        status: "disponivel",
        agendamento_id: null,
        pre_reserva: null,
      },
    },
  );
}

export async function realizarCheckIn(
  codigo: string,
  executado_por: ILogAuditoriaExecutadoPor,
): Promise<IAgendamento> {
  const agendamento = await buscarAgendamento(codigo);

  if (agendamento.status !== "confirmado") {
    throw new AppError("CHECKIN_INVALIDO", 409);
  }

  const dadosAnteriores = agendamento.toObject();
  agendamento.status = "check_in_realizado";
  await agendamento.save();

  await registrarAuditoria({
    entidade: "Agendamento",
    entidade_id: agendamento.codigo_agendamento,
    acao: "CHECK_IN",
    executado_por,
    dados_anteriores: dadosAnteriores,
    dados_novos: { status: "check_in_realizado" },
  });

  return agendamento;
}

export async function marcarNaoCompareceu(
  codigo: string,
  executado_por: ILogAuditoriaExecutadoPor,
): Promise<IAgendamento> {
  const agendamento = await buscarAgendamento(codigo);

  if (!["confirmado", "check_in_realizado"].includes(agendamento.status)) {
    throw new AppError("NAO_COMPARECEU_INVALIDO", 409);
  }

  const dadosAnteriores = agendamento.toObject();
  agendamento.status = "nao_compareceu";
  await agendamento.save();
  await liberarHorario(agendamento.horario_id);

  await registrarAuditoria({
    entidade: "Agendamento",
    entidade_id: agendamento.codigo_agendamento,
    acao: "NAO_COMPARECEU",
    executado_por,
    dados_anteriores: dadosAnteriores,
    dados_novos: { status: "nao_compareceu" },
  });

  return agendamento;
}

export async function concluirAtendimento(
  codigo: string,
  executado_por: ILogAuditoriaExecutadoPor,
): Promise<IAgendamento> {
  const agendamento = await buscarAgendamento(codigo);

  if (!["check_in_realizado", "em_atendimento"].includes(agendamento.status)) {
    throw new AppError("CONCLUSAO_INVALIDA", 409);
  }

  const dadosAnteriores = agendamento.toObject();
  agendamento.status = "concluido";
  await agendamento.save();

  await registrarAuditoria({
    entidade: "Agendamento",
    entidade_id: agendamento.codigo_agendamento,
    acao: "CONCLUIR",
    executado_por,
    dados_anteriores: dadosAnteriores,
    dados_novos: { status: "concluido" },
  });

  return agendamento;
}
