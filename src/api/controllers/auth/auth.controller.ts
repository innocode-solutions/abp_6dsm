import type { NextFunction, Request, Response } from "express";

import { autenticarFuncionario } from "../../service/auth.service.js";
import { AppError } from "../../types/common.types.js";
import { success } from "../../utils/responseHelper.js";

function assertCredenciais(body: Record<string, unknown>): { email: string; senha: string } {
  const { email, senha } = body;
  if (
    typeof email !== "string" ||
    email.trim() === "" ||
    typeof senha !== "string" ||
    senha.trim() === ""
  ) {
    throw new AppError("ERRO_VALIDACAO", 400);
  }

  return { email, senha };
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, senha } = assertCredenciais(req.body);
    const resultado = await autenticarFuncionario(email, senha);
    res.status(200).json(success(resultado));
  } catch (error) {
    next(error);
  }
}
