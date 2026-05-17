import type { AddressInfo } from "node:net";
import type express from "express";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/api/app.js";

vi.mock("dotenv", () => ({
  default: {
    config: vi.fn(),
  },
}));

vi.hoisted(() => {
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/test_db";
  process.env.JWT_SECRET = "jwt-test-secret";
  process.env.CHATBOT_API_KEY = "chatbot-test-key";
});

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
            server.close((err?: Error) => (err ? rej(err) : res()));
          }),
      });
    });
    server.on("error", reject);
  });
}

describe("src/api/app", () => {
  it("GET / retorna 404 fora das rotas da API", async () => {
    const app = createApp();
    const { port, close } = await listenOnce(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      expect(res.status).toBe(404);
    } finally {
      await close();
    }
  });

  it("aceita JSON no body quando Content-Type é application/json", async () => {
    const app = createApp();
    const { port, close } = await listenOnce(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/qualquer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true }),
      });
      expect(res.status).toBe(404);
    } finally {
      await close();
    }
  });

  it("GET /api-docs.json retorna a especificacao OpenAPI", async () => {
    const app = createApp();
    const { port, close } = await listenOnce(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api-docs.json`);
      const body = (await res.json()) as {
        openapi: string;
        paths: Record<string, unknown>;
        components: { securitySchemes: Record<string, unknown> };
      };

      expect(res.status).toBe(200);
      expect(body.openapi).toBe("3.0.3");
      expect(body.paths["/api/v1/auth/login"]).toBeDefined();
      expect(body.paths["/api/v1/agendamentos/admin/agenda"]).toBeDefined();
      expect(body.components.securitySchemes.bearerAuth).toBeDefined();
      expect(body.components.securitySchemes.apiKeyAuth).toBeDefined();
    } finally {
      await close();
    }
  });
});
