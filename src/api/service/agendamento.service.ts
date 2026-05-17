import mongoose, { type Types } from "mongoose";

import AgendamentoModel, {
  type IAgendamento,
  type IAgendamentoCidadao,
} from "../models/Agendamento.model.js";
import HorarioModel from "../models/Horario.model.js";
import type { ILogAuditoriaExecutadoPor } from "../models/LogAuditoria.model.js";
import { AppError } from "../types/common.types.js";
import { generateProtocolo } from "./protocolo.service.js";
import { registrarAuditoria } from "./auditoria.service.js";

const HORAS_MINIMAS_ANTECEDENCIA = 2;
const MAX_REMARCACOES = 2;

const STATUS_ATIVOS = ["pendente", "confirmado", "check_in_realizado"] as const;
const STATUS_CANCELAVEIS = ["pendente", "confirmado"] as const;
const STATUS_REMARCAVEL = ["pendente", "confirmado"] as const;

function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
}

function normalizarCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

function validarAntecedenciaMinima(inicio_em: Date, horasMinimas: number): void {
  const limiteMs = horasMinimas * 60 * 60 * 1000;
  if (inicio_em.getTime() - Date.now() < limiteMs) {
    throw new AppError("CANCELAMENTO_FORA_DO_PRAZO", 409);
  }
}

function validarAntecedenciaRemarcacao(inicio_em: Date): void {
  const limiteMs = HORAS_MINIMAS_ANTECEDENCIA * 60 * 60 * 1000;
  if (inicio_em.getTime() - Date.now() < limiteMs) {
    throw new AppError("REMARCACAO_FORA_DO_PRAZO", 409);
  }
}

async function assertSemAgendamentoAtivoDuplicado(cpf: string): Promise<void> {
  const existente = await AgendamentoModel.exists({
    "cidadao.cpf": cpf,
    status: { $in: [...STATUS_ATIVOS] },
  });

  if (existente) {
    throw new AppError("AGENDAMENTO_DUPLICADO", 409);
  }
}

export interface ConfirmarAgendamentoInput {
  horario_id: string | Types.ObjectId;
  pre_reserva_id: string | Types.ObjectId;
  conversa_id: string;
  cidadao: IAgendamentoCidadao;
  assunto: string;
  descricao: string;
}

export async function confirmarAgendamento(
  dados: ConfirmarAgendamentoInput,
): Promise<IAgendamento> {
  const cpf = normalizarCpf(dados.cidadao.cpf);
  await assertSemAgendamentoAtivoDuplicado(cpf);

  const preReservaId = toObjectId(dados.pre_reserva_id);
  const horarioId = toObjectId(dados.horario_id);
  const agora = new Date();

  const horario = await HorarioModel.findOneAndUpdate(
    {
      _id: horarioId,
      status: "pre_reservado",
      "pre_reserva.pre_reserva_id": preReservaId,
      "pre_reserva.conversa_id": dados.conversa_id,
      "pre_reserva.expira_em": { $gt: agora },
    },
    {
      $set: { status: "agendado" },
    },
    { new: true },
  );

  if (!horario) {
    throw new AppError("PRE_RESERVA_EXPIRADA", 409);
  }

  const codigo_agendamento = await generateProtocolo();

  let agendamento: IAgendamento;
  try {
    agendamento = await AgendamentoModel.create({
      codigo_agendamento,
      cidadao: { nome: dados.cidadao.nome, cpf },
      servico_id: horario.servico_id,
      funcionario_id: horario.funcionario_id,
      horario_id: horario._id,
      status: "confirmado",
      inicio_em: horario.inicio_em,
      fim_em: horario.fim_em,
      assunto: dados.assunto,
      descricao: dados.descricao,
      origem: "whatsapp",
      conversa_id: dados.conversa_id,
      remarcacoes_count: 0,
    });
  } catch (err) {
    await HorarioModel.updateOne(
      { _id: horario._id },
      { $set: { status: "pre_reservado" } },
    );
    throw err;
  }

  await HorarioModel.updateOne(
    { _id: horario._id },
    { $set: { agendamento_id: agendamento._id } },
  );

  await registrarAuditoria({
    entidade: "Agendamento",
    entidade_id: agendamento.codigo_agendamento,
    acao: "CONFIRMAR",
    executado_por: { tipo: "sistema", id: dados.conversa_id },
    dados_novos: {
      codigo_agendamento,
      horario_id: horario._id.toString(),
      conversa_id: dados.conversa_id,
    },
  });

  return agendamento;
}

export async function consultarAgendamento(codigo: string): Promise<IAgendamento> {
  const agendamento = await AgendamentoModel.findOne({ codigo_agendamento: codigo }).lean();
  if (!agendamento) {
    throw new AppError("AGENDAMENTO_NAO_ENCONTRADO", 404);
  }
  return agendamento;
}

export interface CancelarAgendamentoInput {
  codigo: string;
  motivo: string;
  cancelado_por: ILogAuditoriaExecutadoPor;
  conversa_id: string;
}

async function liberarHorario(horario_id: Types.ObjectId): Promise<void> {
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

export async function cancelarAgendamento(
  input: CancelarAgendamentoInput,
): Promise<IAgendamento> {
  const agendamento = await AgendamentoModel.findOne({ codigo_agendamento: input.codigo });
  if (!agendamento) {
    throw new AppError("AGENDAMENTO_NAO_ENCONTRADO", 404);
  }

  if (agendamento.conversa_id !== input.conversa_id) {
    throw new AppError("AGENDAMENTO_NAO_ENCONTRADO", 404);
  }

  if (!STATUS_CANCELAVEIS.includes(agendamento.status as (typeof STATUS_CANCELAVEIS)[number])) {
    throw new AppError("CANCELAMENTO_FORA_DO_PRAZO", 409);
  }

  validarAntecedenciaMinima(agendamento.inicio_em, HORAS_MINIMAS_ANTECEDENCIA);

  const dadosAnteriores = agendamento.toObject();

  agendamento.status = "cancelado";
  await agendamento.save();
  await liberarHorario(agendamento.horario_id);

  await registrarAuditoria({
    entidade: "Agendamento",
    entidade_id: agendamento.codigo_agendamento,
    acao: "CANCELAR",
    executado_por: input.cancelado_por,
    dados_anteriores: dadosAnteriores,
    dados_novos: {
      status: "cancelado",
      motivo: input.motivo,
      conversa_id: input.conversa_id,
    },
  });

  return agendamento;
}

export interface RemarcarAgendamentoInput {
  codigo: string;
  novo_horario_id: string | Types.ObjectId;
  conversa_id: string;
  motivo: string;
}

export async function remarcarAgendamento(
  input: RemarcarAgendamentoInput,
): Promise<IAgendamento> {
  const agendamento = await AgendamentoModel.findOne({ codigo_agendamento: input.codigo });
  if (!agendamento) {
    throw new AppError("AGENDAMENTO_NAO_ENCONTRADO", 404);
  }

  if (agendamento.conversa_id !== input.conversa_id) {
    throw new AppError("AGENDAMENTO_NAO_ENCONTRADO", 404);
  }

  if (!STATUS_REMARCAVEL.includes(agendamento.status as (typeof STATUS_REMARCAVEL)[number])) {
    throw new AppError("REMARCACAO_FORA_DO_PRAZO", 409);
  }

  if (agendamento.remarcacoes_count >= MAX_REMARCACOES) {
    throw new AppError("REMARCACAO_FORA_DO_PRAZO", 409);
  }

  validarAntecedenciaRemarcacao(agendamento.inicio_em);

  const novoHorarioId = toObjectId(input.novo_horario_id);
  const dadosAnteriores = agendamento.toObject();

  const novoHorario = await HorarioModel.findOneAndUpdate(
    { _id: novoHorarioId, status: "disponivel" },
    { $set: { status: "agendado" } },
    { new: true },
  );

  if (!novoHorario) {
    throw new AppError("HORARIO_INDISPONIVEL", 409);
  }

  const codigo_agendamento = await generateProtocolo();

  let novoAgendamento: IAgendamento;
  try {
    novoAgendamento = await AgendamentoModel.create({
      codigo_agendamento,
      cidadao: agendamento.cidadao,
      servico_id: novoHorario.servico_id,
      funcionario_id: novoHorario.funcionario_id,
      horario_id: novoHorario._id,
      status: "confirmado",
      inicio_em: novoHorario.inicio_em,
      fim_em: novoHorario.fim_em,
      assunto: agendamento.assunto,
      descricao: agendamento.descricao,
      origem: agendamento.origem,
      conversa_id: input.conversa_id,
      remarcacoes_count: agendamento.remarcacoes_count + 1,
      codigo_agendamento_anterior: agendamento.codigo_agendamento,
    });
  } catch (err) {
    await HorarioModel.updateOne({ _id: novoHorario._id }, { $set: { status: "disponivel" } });
    throw err;
  }

  await HorarioModel.updateOne(
    { _id: novoHorario._id },
    { $set: { agendamento_id: novoAgendamento._id } },
  );

  agendamento.status = "remarcado";
  await agendamento.save();
  await liberarHorario(agendamento.horario_id);

  await registrarAuditoria({
    entidade: "Agendamento",
    entidade_id: agendamento.codigo_agendamento,
    acao: "REMARCAR",
    executado_por: { tipo: "sistema", id: input.conversa_id },
    dados_anteriores: dadosAnteriores,
    dados_novos: {
      codigo_agendamento_novo: novoAgendamento.codigo_agendamento,
      novo_horario_id: novoHorario._id.toString(),
      motivo: input.motivo,
    },
  });

  return novoAgendamento;
}
