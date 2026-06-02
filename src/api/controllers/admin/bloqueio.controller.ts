import type { NextFunction, Request, Response } from "express";

import * as bloqueioService from "../../service/bloqueio.service.js";
import { AppError } from "../../types/common.types.js";
import { success } from "../../utils/responseHelper.js";
import {
  assertCamposObrigatorios,
  assertObjectId,
} from "../../utils/validationHelper.js";

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export async function criarBloqueio(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    assertCamposObrigatorios(req.body, [
      "funcionario_id",
      "inicio_em",
      "fim_em",
      "motivo",
    ]);
    assertObjectId(String(req.body.funcionario_id), "funcionario_id");

    const inicio_em = new Date(String(req.body.inicio_em));
    const fim_em = new Date(String(req.body.fim_em));
    if (Number.isNaN(inicio_em.getTime()) || Number.isNaN(fim_em.getTime())) {
      throw new AppError("ERRO_VALIDACAO", 400);
    }

    const resultado = await bloqueioService.criarBloqueio({
      funcionario_id: String(req.body.funcionario_id),
      inicio_em,
      fim_em,
      motivo: String(req.body.motivo),
      criado_por: req.usuario!.id,
    });
    res.status(201).json(success(resultado));
  } catch (error) {
    next(error);
  }
}

export async function removerBloqueio(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const bloqueioId = paramId(req.params.id);
    assertObjectId(bloqueioId, "id");

    const resultado = await bloqueioService.removerBloqueio(bloqueioId);
    res.status(200).json(success(resultado));
  } catch (error) {
    next(error);
  }
}
