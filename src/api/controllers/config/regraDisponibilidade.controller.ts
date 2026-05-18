import type { NextFunction, Request, Response } from "express";

import RegraDisponibilidade from "../../models/RegraDisponibilidade.model.js";
import { AppError } from "../../types/common.types.js";
import { success } from "../../utils/responseHelper.js";
import {
  assertFuncionarioExisteEAtivo,
  assertServicoExisteEAtivo,
} from "../../service/validacao/referencias.service.js";
import {
  assertCamposObrigatorios,
  assertObjectId,
  filtroAtivo,
  paramId,
} from "./config.helpers.js";

const CAMPOS_OBRIGATORIOS = [
  "funcionario_id",
  "servico_id",
  "dia_semana",
  "hora_inicio",
  "hora_fim",
  "duracao_horario_minutos",
] as const;

export async function listar(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const regras = await RegraDisponibilidade.find(filtroAtivo(req.query));
    res.status(200).json(success(regras));
  } catch (error) {
    next(error);
  }
}

export async function criar(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    assertCamposObrigatorios(req.body, [...CAMPOS_OBRIGATORIOS]);
    assertObjectId(String(req.body.funcionario_id), "funcionario_id");
    assertObjectId(String(req.body.servico_id), "servico_id");
    await assertFuncionarioExisteEAtivo(String(req.body.funcionario_id));
    await assertServicoExisteEAtivo(String(req.body.servico_id));

    const duracao = Number(req.body.duracao_horario_minutos);
    const diaSemana = Number(req.body.dia_semana);
    if (
      !Number.isFinite(duracao) ||
      duracao < 1 ||
      !Number.isInteger(diaSemana) ||
      diaSemana < 0 ||
      diaSemana > 6
    ) {
      throw new AppError("ERRO_VALIDACAO", 400);
    }

    const regra = await RegraDisponibilidade.create({
      funcionario_id: req.body.funcionario_id,
      servico_id: req.body.servico_id,
      dia_semana: diaSemana,
      hora_inicio: req.body.hora_inicio,
      hora_fim: req.body.hora_fim,
      duracao_horario_minutos: duracao,
    });
    res.status(201).json(success(regra));
  } catch (error) {
    next(error);
  }
}

export async function buscarPorId(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const regra = await RegraDisponibilidade.findById(paramId(req.params.id));
    if (!regra) {
      throw new AppError("NAO_ENCONTRADO", 404);
    }
    res.status(200).json(success(regra));
  } catch (error) {
    next(error);
  }
}

export async function atualizar(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    if (body.funcionario_id !== undefined) {
      assertObjectId(String(body.funcionario_id), "funcionario_id");
      await assertFuncionarioExisteEAtivo(String(body.funcionario_id));
    }
    if (body.servico_id !== undefined) {
      assertObjectId(String(body.servico_id), "servico_id");
      await assertServicoExisteEAtivo(String(body.servico_id));
    }

    const regra = await RegraDisponibilidade.findByIdAndUpdate(
      paramId(req.params.id),
      { $set: { ...req.body, atualizado_em: new Date() } },
      { new: true, runValidators: true },
    );
    if (!regra) {
      throw new AppError("NAO_ENCONTRADO", 404);
    }
    res.status(200).json(success(regra));
  } catch (error) {
    next(error);
  }
}

export async function remover(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const regra = await RegraDisponibilidade.findByIdAndUpdate(
      paramId(req.params.id),
      { $set: { ativo: false, atualizado_em: new Date() } },
      { new: true },
    );
    if (!regra) {
      throw new AppError("NAO_ENCONTRADO", 404);
    }
    res.status(200).json(success(regra));
  } catch (error) {
    next(error);
  }
}
