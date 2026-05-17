import { addDays, startOfDay } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import mongoose, { type Types } from "mongoose";

import AgendamentoModel, { type IAgendamento } from "../models/Agendamento.model.js";
import type { AgendamentoStatus } from "../models/Agendamento.model.js";

const TIMEZONE_BR = "America/Sao_Paulo";

function inicioDoDiaBrasilia(ref: Date): Date {
  const zoned = toZonedTime(ref, TIMEZONE_BR);
  return fromZonedTime(startOfDay(zoned), TIMEZONE_BR);
}

function fimDoDiaBrasilia(ref: Date): Date {
  return addDays(inicioDoDiaBrasilia(ref), 1);
}

function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
}

export interface ListarAgendaFiltros {
  data?: Date;
  status?: AgendamentoStatus;
  funcionario_id?: string | Types.ObjectId;
}

export async function listarAgenda(filtros: ListarAgendaFiltros): Promise<IAgendamento[]> {
  const query: Record<string, unknown> = {};

  if (filtros.data) {
    const inicio = inicioDoDiaBrasilia(filtros.data);
    const fim = fimDoDiaBrasilia(filtros.data);
    query.inicio_em = { $gte: inicio, $lt: fim };
  }

  if (filtros.status) {
    query.status = filtros.status;
  }

  if (filtros.funcionario_id) {
    query.funcionario_id = toObjectId(filtros.funcionario_id);
  }

  return AgendamentoModel.find(query)
    .populate("servico_id", "nome duracao_minutos")
    .populate("funcionario_id", "nome email perfil")
    .populate("horario_id", "inicio_em fim_em status")
    .sort({ inicio_em: 1 })
    .lean();
}

export function parseDataAgenda(value: string): Date | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = fromZonedTime(`${trimmed}T00:00:00`, TIMEZONE_BR);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function formatDataAgenda(date: Date): string {
  return formatInTimeZone(date, TIMEZONE_BR, "yyyy-MM-dd");
}
