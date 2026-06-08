import { Request, Response, NextFunction } from "express";
import { logger } from "../../monitoring/logger";

/**
 * Registra cada requisição HTTP ao finalizar a resposta (método, rota, status, duração).
 * Saída em stdout para captura por Docker/Railway.
 */
export function requestLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startedAt = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const context = {
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs
    };

    if (res.statusCode >= 500) {
      logger.error("Requisição HTTP concluída com erro", undefined, context);
      return;
    }

    if (res.statusCode >= 400) {
      logger.warn("Requisição HTTP concluída com aviso", context);
      return;
    }

    logger.info("Requisição HTTP", context);
  });

  next();
}