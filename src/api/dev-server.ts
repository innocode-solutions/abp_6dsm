/**
 * Script de desenvolvimento isolado para testar as rotas HTTP do ERP
 * sem precisar subir o bot WhatsApp ou conectar ao MongoDB.
 *
 * Uso:
 *   npx tsx src/api/dev-server.ts
 *
 * O terminal vai imprimir a porta e um Bearer token pronto para copiar.
 */
import "dotenv/config";
import jwt from "jsonwebtoken";

import { createHttpServer } from "./server-http";
import { logger } from "../monitoring/logger";
import type { ChatMessage, IHistoryRepository } from "../messages/history";

// ── Repositório fake em memória para testes locais ────────────────────────────
class InMemoryHistoryRepository implements IHistoryRepository {
  private store: ChatMessage[] = [
    {
      from: "5511999990001",
      body: "Quero cancelar meu plano",
      direction: "in",
      timestamp: new Date().toISOString()
    },
    {
      from: "5511999990001",
      body: "Ok, vou te ajudar.",
      direction: "out",
      timestamp: new Date().toISOString()
    },
    {
      from: "5511999990002",
      body: "Produto com defeito",
      direction: "in",
      timestamp: new Date().toISOString()
    }
  ];

  async save(message: ChatMessage): Promise<void> {
    this.store.push(message);
  }

  async findByUser(userId: string): Promise<ChatMessage[]> {
    return this.store.filter((message) => message.from === userId);
  }
}

// ── JWT para testes ───────────────────────────────────────────────────────────
const secret = process.env.JWT_SECRET;

if (!secret) {
  logger.error("JWT_SECRET não definido no .env — abortando.", {
    module: "DEV_SERVER"
  });

  process.exit(1);
}

const token = jwt.sign(
  {
    id: "dev-user",
    perfil: "admin"
  },
  secret,
  {
    expiresIn: "1h"
  }
);

// ── Sobe o servidor ───────────────────────────────────────────────────────────
const app = createHttpServer({
  historyRepository: new InMemoryHistoryRepository()
});

const PORT = Number(process.env.HTTP_PORT ?? 3000);

app.listen(PORT, () => {
  logger.info("Servidor HTTP de desenvolvimento iniciado.", {
    module: "DEV_SERVER",
    port: PORT
  });

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║       ProconBot — Servidor HTTP de desenvolvimento       ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  Base URL : http://localhost:${PORT}                         ║`);
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  Rotas disponíveis:                                      ║");
  console.log("║                                                          ║");
  console.log(`║  GET  http://localhost:${PORT}/health                        ║`);
  console.log(`║  GET  http://localhost:${PORT}/api/kpi/dashboard             ║`);
  console.log("║       ?users=5511999990001,5511999990002                 ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  Header obrigatório para /api/kpi/*:                    ║");
  console.log("║                                                          ║");
  console.log(`║  Authorization: Bearer ${token.slice(0, 32)}…  ║`);
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  Token completo (copie para o Insomnia / Postman / curl):║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
  console.log(token);
  console.log("\n─── curl de exemplo ────────────────────────────────────────");
  console.log(`curl -H "Authorization: Bearer ${token}" \\`);
  console.log(
    `  "http://localhost:${PORT}/api/kpi/dashboard?users=5511999990001,5511999990002"\n`
  );
});