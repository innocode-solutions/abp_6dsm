import rateLimit from "express-rate-limit";

import { buildMeta } from "../utils/responseHelper.js";

const rateLimitMessage = "Muitas requisições. Tente novamente em alguns instantes.";

function createLimiter(max: number) {
  return rateLimit({
    windowMs: 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        erro: {
          codigo: "LIMITE_REQUISICOES",
          mensagem: rateLimitMessage,
        },
        meta: buildMeta(),
      });
    },
  });
}

export const chatbotLimiter = createLimiter(60);
export const adminLimiter = createLimiter(120);
