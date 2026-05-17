import type { NextFunction, Request, Response } from "express";

import { AppError } from "../types/common.types.js";
import { buildMeta } from "../utils/responseHelper.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.httpStatus).json({
      erro: {
        codigo: err.codigo,
        mensagem: err.mensagem,
      },
      meta: buildMeta(),
    });
    return;
  }

  console.error(err);

  const body: {
    erro: { codigo: string; mensagem: string };
    meta: { requisicao_id: string; timestamp: string };
    stack?: string;
  } = {
    erro: {
      codigo: "ERRO_INTERNO",
      mensagem: "Erro interno do servidor.",
    },
    meta: buildMeta(),
  };

  if (process.env.NODE_ENV !== "production" && err instanceof Error && err.stack) {
    body.stack = err.stack;
  }

  res.status(500).json(body);
}
