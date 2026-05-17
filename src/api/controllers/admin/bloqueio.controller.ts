import type { NextFunction, Request, Response } from "express";

import * as bloqueioService from "../../service/bloqueio.service.js";
import { success } from "../../utils/responseHelper.js";

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export async function criarBloqueio(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const resultado = await bloqueioService.criarBloqueio({
      funcionario_id: req.body.funcionario_id,
      inicio_em: new Date(req.body.inicio_em),
      fim_em: new Date(req.body.fim_em),
      motivo: req.body.motivo,
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
    const resultado = await bloqueioService.removerBloqueio(paramId(req.params.id));
    res.status(200).json(success(resultado));
  } catch (error) {
    next(error);
  }
}
