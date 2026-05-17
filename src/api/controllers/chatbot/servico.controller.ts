import type { NextFunction, Request, Response } from "express";

import Servico from "../../models/Servico.model.js";
import { success } from "../../utils/responseHelper.js";

export async function listarServicos(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const servicos = await Servico.find({ ativo: true });
    res.status(200).json(success(servicos));
  } catch (error) {
    next(error);
  }
}
