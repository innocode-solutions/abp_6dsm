import { addDays, addMinutes, getDay, startOfDay } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import mongoose, { type Types } from "mongoose";

import BloqueioModel from "../models/Bloqueio.model.js";
import FeriadoModel from "../models/Feriado.model.js";
import HorarioModel, { type HorarioStatus, type IHorario } from "../models/Horario.model.js";
import RegraDisponibilidadeModel from "../models/RegraDisponibilidade.model.js";
import { StatusHorario, type IHorarioExibicao } from "../types/horario.types.js";
import { AppError } from "../types/common.types.js";
import { toBrasiliaDisplay } from "../utils/dateHelper.js";
import { assertObjectId } from "../utils/validationHelper.js";
import {
  assertServicoExisteEAtivo,
  listarIdsFuncionariosAtivos,
  listarIdsServicosAtivos,
} from "./validacao/referencias.service.js";

const TIMEZONE_BR = "America/Sao_Paulo";
const DIAS_PADRAO = 30;
const LIMITE_PADRAO = 5;

function inicioDoDiaBrasilia(ref = new Date()): Date {
  const zoned = toZonedTime(ref, TIMEZONE_BR);
  return fromZonedTime(startOfDay(zoned), TIMEZONE_BR);
}

function fimDoDiaBrasilia(date: Date): Date {
  const zoned = toZonedTime(date, TIMEZONE_BR);
  const inicio = startOfDay(zoned);
  const fimZoned = addDays(inicio, 1);
  return fromZonedTime(fimZoned, TIMEZONE_BR);
}

function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
}

export async function getHorariosDisponiveis(
  servico_id: string | Types.ObjectId,
  de?: Date,
  ate?: Date,
  limite?: number,
): Promise<IHorarioExibicao[]> {
  const servicoIdStr = typeof servico_id === "string" ? servico_id : servico_id.toString();
  assertObjectId(servicoIdStr, "servico_id");
  await assertServicoExisteEAtivo(servico_id);

  const funcionariosAtivos = await listarIdsFuncionariosAtivos();
  if (funcionariosAtivos.length === 0) {
    return [];
  }

  const inicioIntervalo = de ?? inicioDoDiaBrasilia();
  const fimBase = ate ?? addDays(inicioIntervalo, DIAS_PADRAO);
  const fimIntervalo = fimDoDiaBrasilia(fimBase);
  const maxResultados = limite ?? LIMITE_PADRAO;

  const horarios = await HorarioModel.aggregate<IHorario>([
    {
      $match: {
        servico_id: toObjectId(servico_id),
        funcionario_id: { $in: funcionariosAtivos },
        status: "disponivel",
        inicio_em: { $gte: inicioIntervalo, $lte: fimIntervalo },
      },
    },
    { $sort: { inicio_em: 1, _id: 1 } },
    {
      $group: {
        _id: "$inicio_em",
        horario: { $first: "$$ROOT" },
      },
    },
    { $replaceRoot: { newRoot: "$horario" } },
    { $sort: { inicio_em: 1, _id: 1 } },
    { $limit: maxResultados },
  ]);

  return horarios.map((horario) => ({
    _id: horario._id.toString(),
    funcionario_id: horario.funcionario_id.toString(),
    servico_id: horario.servico_id.toString(),
    inicio_em: horario.inicio_em,
    fim_em: horario.fim_em,
    status: horario.status as StatusHorario,
    exibicao: toBrasiliaDisplay(horario.inicio_em),
  }));
}

function parseHora(hora: string): { hours: number; minutes: number } {
  const [h, m] = hora.split(":").map((part) => Number.parseInt(part, 10));
  return { hours: h, minutes: m };
}

function combinarDataHoraBrasilia(dia: Date, hora: string): Date {
  const { hours, minutes } = parseHora(hora);
  const zoned = toZonedTime(dia, TIMEZONE_BR);
  zoned.setHours(hours, minutes, 0, 0);
  return fromZonedTime(zoned, TIMEZONE_BR);
}

function dataIsoBrasilia(dia: Date): string {
  return formatInTimeZone(dia, TIMEZONE_BR, "yyyy-MM-dd");
}

function intervalosSobrepostos(
  inicioA: Date,
  fimA: Date,
  inicioB: Date,
  fimB: Date,
): boolean {
  return inicioA.getTime() < fimB.getTime() && fimA.getTime() > inicioB.getTime();
}

function cadaDiaBrasilia(de: Date, ate: Date): Date[] {
  const dias: Date[] = [];
  let cursor = inicioDoDiaBrasilia(de);
  const limite = inicioDoDiaBrasilia(ate);

  while (cursor.getTime() <= limite.getTime()) {
    dias.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return dias;
}

export interface ListarHorariosAdminFiltros {
  funcionario_id?: string | Types.ObjectId;
  servico_id?: string | Types.ObjectId;
  status?: HorarioStatus;
  de?: Date;
  ate?: Date;
}

export async function listarHorariosAdmin(
  filtros: ListarHorariosAdminFiltros,
): Promise<IHorario[]> {
  const query: Record<string, unknown> = {};

  if (filtros.funcionario_id) {
    const idStr =
      typeof filtros.funcionario_id === "string"
        ? filtros.funcionario_id
        : filtros.funcionario_id.toString();
    assertObjectId(idStr, "funcionario_id");
    query.funcionario_id = toObjectId(filtros.funcionario_id);
  }

  if (filtros.servico_id) {
    const idStr =
      typeof filtros.servico_id === "string"
        ? filtros.servico_id
        : filtros.servico_id.toString();
    assertObjectId(idStr, "servico_id");
    query.servico_id = toObjectId(filtros.servico_id);
  }

  if (filtros.status) {
    query.status = filtros.status;
  }

  if (filtros.de || filtros.ate) {
    const intervalo: Record<string, Date> = {};
    if (filtros.de) {
      intervalo.$gte = filtros.de;
    }
    if (filtros.ate) {
      intervalo.$lte = fimDoDiaBrasilia(filtros.ate);
    }
    query.inicio_em = intervalo;
  }

  return HorarioModel.find(query).sort({ inicio_em: 1 }).lean();
}

export interface GerarHorariosResultado {
  horarios_criados: number;
  de: Date;
  ate: Date;
}

export async function gerarHorarios(
  de: Date,
  ate: Date,
  criado_por: string | Types.ObjectId,
): Promise<GerarHorariosResultado> {
  void criado_por;

  const inicio = inicioDoDiaBrasilia(de);
  const fim = inicioDoDiaBrasilia(ate);

  if (fim.getTime() < inicio.getTime()) {
    throw new AppError("INTERVALO_INVALIDO", 400);
  }

  const regras = await RegraDisponibilidadeModel.find({ ativo: true }).lean();
  if (regras.length === 0) {
    return { horarios_criados: 0, de: inicio, ate: fim };
  }

  const [funcionariosAtivos, servicosAtivos] = await Promise.all([
    listarIdsFuncionariosAtivos(),
    listarIdsServicosAtivos(),
  ]);
  const funcionariosAtivosSet = new Set(funcionariosAtivos.map((id) => id.toString()));
  const servicosAtivosSet = new Set(servicosAtivos.map((id) => id.toString()));

  const regrasValidas = regras.filter(
    (regra) =>
      funcionariosAtivosSet.has(regra.funcionario_id.toString()) &&
      servicosAtivosSet.has(regra.servico_id.toString()),
  );

  if (regrasValidas.length === 0) {
    return { horarios_criados: 0, de: inicio, ate: fim };
  }

  const dias = cadaDiaBrasilia(inicio, fim);
  const datasIso = dias.map((dia) => dataIsoBrasilia(dia));

  const feriados = await FeriadoModel.find({
    data: { $in: datasIso },
    bloqueia_agendamento: true,
    ativo: true,
  }).lean();
  const feriadosSet = new Set(feriados.map((f) => f.data));

  const fimIntervalo = addDays(fim, 1);
  const bloqueios = await BloqueioModel.find({
    inicio_em: { $lt: fimIntervalo },
    fim_em: { $gt: inicio },
  }).lean();

  const candidatos: Array<{
    funcionario_id: Types.ObjectId;
    servico_id: Types.ObjectId;
    inicio_em: Date;
    fim_em: Date;
  }> = [];

  for (const dia of dias) {
    const dataIso = dataIsoBrasilia(dia);
    if (feriadosSet.has(dataIso)) {
      continue;
    }

    const diaSemana = getDay(toZonedTime(dia, TIMEZONE_BR));

    for (const regra of regrasValidas) {
      if (regra.dia_semana !== diaSemana) {
        continue;
      }

      const inicioJanela = combinarDataHoraBrasilia(dia, regra.hora_inicio);
      const fimJanela = combinarDataHoraBrasilia(dia, regra.hora_fim);
      let slotInicio = inicioJanela;

      while (addMinutes(slotInicio, regra.duracao_horario_minutos).getTime() <= fimJanela.getTime()) {
        const slotFim = addMinutes(slotInicio, regra.duracao_horario_minutos);

        const bloqueado = bloqueios.some(
          (bloqueio) =>
            bloqueio.funcionario_id.equals(regra.funcionario_id) &&
            intervalosSobrepostos(
              slotInicio,
              slotFim,
              bloqueio.inicio_em,
              bloqueio.fim_em,
            ),
        );

        if (!bloqueado) {
          candidatos.push({
            funcionario_id: regra.funcionario_id,
            servico_id: regra.servico_id,
            inicio_em: slotInicio,
            fim_em: slotFim,
          });
        }

        slotInicio = slotFim;
      }
    }
  }

  if (candidatos.length === 0) {
    return { horarios_criados: 0, de: inicio, ate: fim };
  }

  const inicios = candidatos.map((c) => c.inicio_em);
  const existentes = await HorarioModel.find({
    inicio_em: { $in: inicios },
  })
    .select("funcionario_id servico_id inicio_em")
    .lean();

  const existentesSet = new Set(
    existentes.map(
      (h) =>
        `${h.funcionario_id.toString()}:${h.servico_id.toString()}:${h.inicio_em.toISOString()}`,
    ),
  );

  const novos = candidatos.filter(
    (c) =>
      !existentesSet.has(
        `${c.funcionario_id.toString()}:${c.servico_id.toString()}:${c.inicio_em.toISOString()}`,
      ),
  );

  if (novos.length === 0) {
    return { horarios_criados: 0, de: inicio, ate: fim };
  }

  await HorarioModel.insertMany(
    novos.map((horario) => ({
      funcionario_id: horario.funcionario_id,
      servico_id: horario.servico_id,
      inicio_em: horario.inicio_em,
      fim_em: horario.fim_em,
      status: "disponivel" as const,
    })),
  );

  return { horarios_criados: novos.length, de: inicio, ate: fim };
}
