import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { IHistoryRepository } from "../messages/history";
import { buildHealthPayload } from "../monitoring/health";
import { logger } from "../monitoring/logger";
import { errorHandler as errorHandlerMiddleware } from "../../src/api/middleware/errorHandler.middleware";
import { requestLoggerMiddleware } from "./middleware/request-logger.middleware";
import { createKpiRouter } from "./routes/kpi.routes";

export interface HttpServerOptions {
  historyRepository?: IHistoryRepository;
}

/**
 * Rate-limit global: 100 req / 15 min por IP.
 * Protege contra scraping e abuso de requisições.
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisições. Tente novamente em 15 minutos." }
});

/**
 * Rate-limit mais restrito para rotas de KPI.
 * Evita abuso e enumeração de dados.
 */
const kpiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Limite de consultas de KPI atingido. Aguarde 1 minuto." }
});

/**
 * Cria e configura o servidor HTTP (Express) separado do bot WhatsApp.
 * Mantém health-check público, logs de requisição e tratamento centralizado de erros.
 */
export function createHttpServer(options: HttpServerOptions = {}) {
  const { historyRepository } = options;
  const app = express();

  // Segurança: cabeçalhos HTTP hardened
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: []
        }
      },
      frameguard: { action: "deny" },
      noSniff: true,
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      hidePoweredBy: true
    })
  );

  // Log de cada requisição recebida
  app.use(requestLoggerMiddleware);

  // Health-check público, disponível mesmo sem MongoDB
  // Fica fora do rate-limit global para não atrapalhar probes do Railway/Docker.
  app.get("/health", (_req, res) => {
    res.json(buildHealthPayload());
  });

  // Rate limiting global
  app.use(globalLimiter);

  // Parsers com limite de tamanho
  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: false, limit: "10kb" }));

  // Rotas de KPI
  if (historyRepository) {
    app.use("/api/kpi", kpiLimiter, createKpiRouter(historyRepository));
  } else {
    logger.warn(
      "Rotas /api/kpi desabilitadas: historyRepository não disponível.",
      {
        module: "API",
        reason: "MongoDB ausente ou desconectado"
      }
    );
  }

  // 404 catch-all
  app.use((_req, res) => {
    res.status(404).json({ error: "Rota não encontrada." });
  });

  // Tratamento centralizado de erros
  app.use(errorHandlerMiddleware);

  return app;
}