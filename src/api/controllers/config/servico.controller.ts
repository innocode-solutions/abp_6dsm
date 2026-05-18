import type { NextFunction, Request, Response } from "express";

import Servico from "../../models/Servico.model.js";
import { bloquearHorariosFuturosPorServico } from "../../service/horarioDesativacao.service.js";
import { AppError } from "../../types/common.types.js";
import { success } from "../../utils/responseHelper.js";
import {
  assertCamposObrigatorios,
  filtroAtivo,
  paramId,
} from "./config.helpers.js";

export async function listar(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const servicos = await Servico.find(filtroAtivo(req.query));
    res.status(200).json(success(servicos));
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
    assertCamposObrigatorios(req.body, ["nome", "descricao", "duracao_minutos"]);

    const duracao = Number(req.body.duracao_minutos);
    if (!Number.isFinite(duracao) || duracao < 1) {
      throw new AppError("ERRO_VALIDACAO", 400);
    }

    const servico = await Servico.create({
      nome: req.body.nome,
      descricao: req.body.descricao,
      duracao_minutos: duracao,
      documentos_necessarios: req.body.documentos_necessarios ?? [],
    });
    res.status(201).json(success(servico));
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
    const servico = await Servico.findById(paramId(req.params.id));
    if (!servico) {
      throw new AppError("NAO_ENCONTRADO", 404);
    }
    res.status(200).json(success(servico));
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
    const id = paramId(req.params.id);
    const anterior = await Servico.findById(id).select("ativo").lean();

    const servico = await Servico.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true },
    );
    if (!servico) {
      throw new AppError("NAO_ENCONTRADO", 404);
    }

    if (anterior?.ativo && servico.ativo === false) {
      await bloquearHorariosFuturosPorServico(servico._id);
    }

    res.status(200).json(success(servico));
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
    const id = paramId(req.params.id);
    const servico = await Servico.findByIdAndUpdate(
      id,
      { $set: { ativo: false } },
      { new: true },
    );
    if (!servico) {
      throw new AppError("NAO_ENCONTRADO", 404);
    }

    await bloquearHorariosFuturosPorServico(servico._id);

    res.status(200).json(success(servico));
  } catch (error) {
    next(error);
  }
}
