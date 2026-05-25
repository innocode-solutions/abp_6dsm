import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { IHistoryRepository } from "../messages/history";
import { createKpiRouter } from "./routes/kpi.routes";

/**
 * Rate-limit global: 100 req / 15 min por IP.
 * Protege contra scraping e força-bruta no endpoint de login futuro.
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,  // envia RateLimit-* headers (RFC 6585)
  legacyHeaders: false,
  message: { error: "Muitas requisições. Tente novamente em 15 minutos." }
});

/**
 * Rate-limit mais restrito para rotas de KPI autenticadas:
 * 30 req / 1 min por IP — evita enumeração de usuários mesmo com token válido.
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
 * Recebe os repositórios por injeção para manter a camada testável.
 */
export function createHttpServer(historyRepository: IHistoryRepository) {
  const app = express();

  // ── Segurança: cabeçalhos HTTP hardened ────────────────────────────────────
  app.use(
    helmet({
      // Content-Security-Policy: bloqueia scripts externos não autorizados (XSS)
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc:  ["'self'"],
          styleSrc:   ["'self'"],
          imgSrc:     ["'self'", "data:"],
          objectSrc:  ["'none'"],
          upgradeInsecureRequests: []
        }
      },
      // X-Frame-Options: DENY — bloqueia clickjacking
      frameguard: { action: "deny" },
      // X-Content-Type-Options: nosniff — evita MIME-sniffing
      noSniff: true,
      // Strict-Transport-Security — força HTTPS em produção
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      // Remove X-Powered-By: Express
      hidePoweredBy: true
    })
  );

  // ── Rate limiting global ───────────────────────────────────────────────────
  app.use(globalLimiter);

  // ── Parsers com limite de tamanho (evita payload bomb) ────────────────────
  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: false, limit: "10kb" }));

  // ── Health-check público ───────────────────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ── Rotas de KPI: JWT + rate-limit específico ──────────────────────────────
  app.use("/api/kpi", kpiLimiter, createKpiRouter(historyRepository));

  // ── 404 catch-all ─────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: "Rota não encontrada." });
  });

  return app;
}
