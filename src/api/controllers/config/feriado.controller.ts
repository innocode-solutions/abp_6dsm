import type { NextFunction, Request, Response } from "express";

import Feriado, { FERIADO_TIPOS } from "../../models/Feriado.model.js";
import { AppError } from "../../types/common.types.js";
import { success } from "../../utils/responseHelper.js";
import {
  assertCamposObrigatorios,
  filtroAtivo,
  paramId,
} from "./config.helpers.js";

const DATA_YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

export async function listar(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const feriados = await Feriado.find(filtroAtivo(req.query));
    res.status(200).json(success(feriados));
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
    assertCamposObrigatorios(req.body, ["data", "nome", "tipo"]);

    if (!DATA_YYYY_MM_DD.test(String(req.body.data))) {
      throw new AppError("ERRO_VALIDACAO", 400);
    }
    if (!FERIADO_TIPOS.includes(req.body.tipo)) {
      throw new AppError("ERRO_VALIDACAO", 400);
    }

    const feriado = await Feriado.create({
      data: req.body.data,
      nome: req.body.nome,
      tipo: req.body.tipo,
      bloqueia_agendamento: req.body.bloqueia_agendamento ?? true,
    });
    res.status(201).json(success(feriado));
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
    const feriado = await Feriado.findById(paramId(req.params.id));
    if (!feriado) {
      throw new AppError("NAO_ENCONTRADO", 404);
    }
    res.status(200).json(success(feriado));
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
    const feriado = await Feriado.findByIdAndUpdate(
      paramId(req.params.id),
      { $set: req.body },
      { new: true, runValidators: true },
    );
    if (!feriado) {
      throw new AppError("NAO_ENCONTRADO", 404);
    }
    res.status(200).json(success(feriado));
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
    const feriado = await Feriado.findByIdAndUpdate(
      paramId(req.params.id),
      { $set: { ativo: false } },
      { new: true },
    );
    if (!feriado) {
      throw new AppError("NAO_ENCONTRADO", 404);
    }
    res.status(200).json(success(feriado));
  } catch (error) {
    next(error);
  }
}
