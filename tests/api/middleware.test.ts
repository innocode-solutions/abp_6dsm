import type { AddressInfo } from "node:net";
import express from "express";
import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("dotenv", () => ({
  default: {
    config: vi.fn(),
  },
}));

const originalEnv = { ...process.env };

function setMinimalValidEnv(): void {
  process.env.MONGO_URI = "mongodb://127.0.0.1:27017/test_db";
  process.env.JWT_SECRET = "jwt-test-secret";
  process.env.CHATBOT_API_KEY = "chatbot-test-key";
}

function listenOnce(app: express.Application): Promise<{ port: number; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("endereço do servidor inválido"));
        return;
      }
      const port = (addr as AddressInfo).port;
      resolve({
        port,
        close: () =>
          new Promise((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          }),
      });
    });
    server.on("error", reject);
  });
}

describe("src/api/middleware", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    setMinimalValidEnv();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("rota protegida sem x-api-key retorna 401 NAO_AUTENTICADO", async () => {
    const { authenticateChatbot } = await import("../../src/api/middleware/auth.middleware.js");
    const { errorHandler } = await import("../../src/api/middleware/errorHandler.middleware.js");

    const app = express();
    app.get("/chatbot", authenticateChatbot, (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);

    const { port, close } = await listenOnce(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/chatbot`);
      const body = (await res.json()) as {
        erro: { codigo: string };
        meta: { requisicao_id: string; timestamp: string };
      };

      expect(res.status).toBe(401);
      expect(body.erro.codigo).toBe("NAO_AUTENTICADO");
      expect(body.meta.requisicao_id).toBeTruthy();
      expect(body.meta.timestamp).toBeTruthy();
    } finally {
      await close();
    }
  });

  it("JWT expirado retorna 401 NAO_AUTENTICADO", async () => {
    const { env } = await import("../../src/api/config/env.js");
    const { authenticateAdmin } = await import("../../src/api/middleware/auth.middleware.js");
    const { errorHandler } = await import("../../src/api/middleware/errorHandler.middleware.js");

    const token = jwt.sign({ id: "func-1", perfil: "admin" }, env.JWT_SECRET, { expiresIn: -1 });

    const app = express();
    app.get("/admin", authenticateAdmin, (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);

    const { port, close } = await listenOnce(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json()) as { erro: { codigo: string } };

      expect(res.status).toBe(401);
      expect(body.erro.codigo).toBe("NAO_AUTENTICADO");
    } finally {
      await close();
    }
  });

  it("perfil atendente em rota exclusiva de admin retorna 403 SEM_PERMISSAO", async () => {
    const { env } = await import("../../src/api/config/env.js");
    const { authenticateAdmin } = await import("../../src/api/middleware/auth.middleware.js");
    const { requirePerfil } = await import("../../src/api/middleware/perfil.middleware.js");
    const { errorHandler } = await import("../../src/api/middleware/errorHandler.middleware.js");

    const token = jwt.sign({ id: "func-2", perfil: "atendente" }, env.JWT_SECRET);

    const app = express();
    app.get("/admin-only", authenticateAdmin, requirePerfil("admin"), (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);

    const { port, close } = await listenOnce(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/admin-only`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json()) as { erro: { codigo: string } };

      expect(res.status).toBe(403);
      expect(body.erro.codigo).toBe("SEM_PERMISSAO");
    } finally {
      await close();
    }
  });

  it("mais de 60 requisições em 1 minuto retorna 429 LIMITE_REQUISICOES", async () => {
    const { chatbotLimiter } = await import("../../src/api/middleware/rateLimiter.middleware.js");

    const app = express();
    app.use(chatbotLimiter);
    app.get("/limited", (_req, res) => {
      res.json({ ok: true });
    });

    const { port, close } = await listenOnce(app);
    try {
      const url = `http://127.0.0.1:${port}/limited`;
      let lastStatus = 200;
      let lastBody: {
        erro?: { codigo: string; mensagem: string };
        meta?: { requisicao_id: string; timestamp: string };
      } = {};

      for (let i = 0; i < 61; i += 1) {
        const res = await fetch(url);
        lastStatus = res.status;
        lastBody = (await res.json()) as typeof lastBody;
      }

      expect(lastStatus).toBe(429);
      expect(lastBody.erro?.codigo).toBe("LIMITE_REQUISICOES");
      expect(lastBody.erro?.mensagem).toBeTruthy();
      expect(lastBody.meta?.requisicao_id).toBeTruthy();
      expect(lastBody.meta?.timestamp).toBeTruthy();
    } finally {
      await close();
    }
  });

  it("erro inesperado retorna 500 ERRO_INTERNO sem stack em produção", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const { errorHandler } = await import("../../src/api/middleware/errorHandler.middleware.js");

    const app = express();
    app.get("/boom", () => {
      throw new Error("falha interna");
    });
    app.use(errorHandler);

    const { port, close } = await listenOnce(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/boom`);
      const body = (await res.json()) as {
        erro: { codigo: string; mensagem: string };
        stack?: string;
      };

      expect(res.status).toBe(500);
      expect(body.erro.codigo).toBe("ERRO_INTERNO");
      expect(body.stack).toBeUndefined();
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      await close();
    }
  });
});
