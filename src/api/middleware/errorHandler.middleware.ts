import type { NextFunction, Request, Response } from "express";

import { logger } from "../../monitoring/logger";
import { AppError } from "../types/common.types.js";
import { buildMeta } from "../utils/responseHelper.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error("Erro na requisição", err, {
    method: req.method,
    path: req.originalUrl,
  });

  if (res.headersSent) {
    return;
  }

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

  const body: {
    erro: {
      codigo: string;
      mensagem: string;
    };
    meta: ReturnType<typeof buildMeta>;
    stack?: string;
  } = {
    erro: {
      codigo: "ERRO_INTERNO",
      mensagem: "Erro interno do servidor.",
    },
    meta: buildMeta(),
  };

  if (
    process.env.NODE_ENV !== "production" &&
    err instanceof Error &&
    err.stack
  ) {
    body.stack = err.stack;
  }

  res.status(500).json(body);
}