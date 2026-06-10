import mongoose, { type Types } from "mongoose";

import FuncionarioModel from "../../models/Funcionario.model.js";
import ServicoModel from "../../models/Servico.model.js";
import { AppError } from "../../types/common.types.js";
import { assertObjectId } from "../../utils/validationHelper.js";

function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
}

function idParaString(id: string | Types.ObjectId): string {
  return typeof id === "string" ? id : id.toString();
}

export async function assertFuncionarioExisteEAtivo(
  funcionario_id: string | Types.ObjectId,
): Promise<void> {
  const idStr = idParaString(funcionario_id);
  assertObjectId(idStr, "funcionario_id");

  const id = toObjectId(funcionario_id);
  const funcionario = await FuncionarioModel.findById(id).select("ativo").lean();

  if (!funcionario) {
    throw new AppError("FUNCIONARIO_NAO_ENCONTRADO", 404);
  }

  if (!funcionario.ativo) {
    throw new AppError("FUNCIONARIO_INATIVO", 409);
  }
}

export async function assertServicoExisteEAtivo(
  servico_id: string | Types.ObjectId,
): Promise<void> {
  const idStr = idParaString(servico_id);
  assertObjectId(idStr, "servico_id");

  const id = toObjectId(servico_id);
  const servico = await ServicoModel.findById(id).select("ativo").lean();

  if (!servico) {
    throw new AppError("SERVICO_NAO_ENCONTRADO", 404);
  }

  if (!servico.ativo) {
    throw new AppError("SERVICO_INATIVO", 409);
  }
}

export interface HorarioComReferencias {
  funcionario_id: Types.ObjectId;
  servico_id: Types.ObjectId;
}

export async function assertHorarioReferenciasAtivas(
  horario: HorarioComReferencias,
): Promise<void> {
  await assertFuncionarioExisteEAtivo(horario.funcionario_id);
  await assertServicoExisteEAtivo(horario.servico_id);
}

export async function listarIdsFuncionariosAtivos(): Promise<Types.ObjectId[]> {
  const funcionarios = await FuncionarioModel.find({ ativo: true }).select("_id").lean();
  return funcionarios.map((f) => f._id);
}

export async function listarIdsServicosAtivos(): Promise<Types.ObjectId[]> {
  const servicos = await ServicoModel.find({ ativo: true }).select("_id").lean();
  return servicos.map((s) => s._id);
}

export async function funcionarioEstaAtivo(funcionario_id: Types.ObjectId): Promise<boolean> {
  const existe = await FuncionarioModel.exists({ _id: funcionario_id, ativo: true });
  return Boolean(existe);
}

export async function servicoEstaAtivo(servico_id: Types.ObjectId): Promise<boolean> {
  const existe = await ServicoModel.exists({ _id: servico_id, ativo: true });
  return Boolean(existe);
}
