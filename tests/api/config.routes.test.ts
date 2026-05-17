import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("dotenv", () => ({
  default: {
    config: vi.fn(),
  },
}));

vi.mock("../../src/api/config/env.js", () => ({
  env: {
    PORT: 3000,
    MONGO_URI: "mongodb://127.0.0.1:27017/test_db",
    JWT_SECRET: "jwt-test-secret",
    CHATBOT_API_KEY: "chatbot-test-key",
  },
}));

const originalEnv = { ...process.env };
const BASE = "/api/v1/agendamentos/admin";
const ID = "507f1f77bcf86cd799439011";

function setMinimalValidEnv(): void {
  process.env.MONGO_URI = "mongodb://127.0.0.1:27017/test_db";
  process.env.JWT_SECRET = "jwt-test-secret";
  process.env.CHATBOT_API_KEY = "chatbot-test-key";
}

function adminToken(perfil: string = "admin"): string {
  return jwt.sign({ id: "func-admin", perfil }, "jwt-test-secret");
}

function listenOnce(
  app: import("express").Application,
): Promise<{ port: number; close: () => Promise<void> }> {
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

describe(
  "rotas config /api/v1/agendamentos/admin",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.resetModules();
      process.env = { ...originalEnv };
      setMinimalValidEnv();
    });

    afterEach(() => {
      process.env = { ...originalEnv };
      vi.restoreAllMocks();
      vi.resetModules();
    });

    it("POST /servicos com campos obrigatórios faltando retorna 400 ERRO_VALIDACAO", async () => {
      const Servico = (await import("../../src/api/models/Servico.model.js"))
        .default as unknown as {
        create: (...args: unknown[]) => Promise<unknown>;
      };
      const createSpy = vi.spyOn(Servico, "create");

      const { createApp } = await import("../../src/api/app.js");
      const app = createApp();
      const { port, close } = await listenOnce(app);

      try {
        const res = await fetch(`http://127.0.0.1:${port}${BASE}/servicos`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${adminToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ nome: "Atendimento" }),
        });
        const body = (await res.json()) as { erro: { codigo: string } };

        expect(res.status).toBe(400);
        expect(body.erro.codigo).toBe("ERRO_VALIDACAO");
        expect(createSpy).not.toHaveBeenCalled();
      } finally {
        await close();
      }
    });

    it("GET /servicos/:id com id inexistente retorna 404 NAO_ENCONTRADO", async () => {
      const Servico = (await import("../../src/api/models/Servico.model.js"))
        .default as unknown as {
        findById: (...args: unknown[]) => Promise<unknown>;
      };
      const findByIdSpy = vi.spyOn(Servico, "findById").mockResolvedValue(null);

      const { createApp } = await import("../../src/api/app.js");
      const app = createApp();
      const { port, close } = await listenOnce(app);

      try {
        const res = await fetch(`http://127.0.0.1:${port}${BASE}/servicos/${ID}`, {
          headers: { Authorization: `Bearer ${adminToken()}` },
        });
        const body = (await res.json()) as { erro: { codigo: string } };

        expect(res.status).toBe(404);
        expect(body.erro.codigo).toBe("NAO_ENCONTRADO");
        expect(findByIdSpy).toHaveBeenCalledWith(ID);
      } finally {
        await close();
      }
    });

    it("DELETE /funcionarios/:id faz soft delete e mantém documento", async () => {
      const Funcionario = (await import("../../src/api/models/Funcionario.model.js"))
        .default as unknown as {
        findByIdAndUpdate: (...args: unknown[]) => Promise<unknown>;
        findById: (...args: unknown[]) => Promise<{ ativo: boolean } | null>;
      };
      const documento = {
        _id: ID,
        nome: "Maria",
        email: "maria@teste.com",
        perfil: "atendente" as const,
        ativo: false,
      };
      const findByIdAndUpdateSpy = vi
        .spyOn(Funcionario, "findByIdAndUpdate")
        .mockResolvedValue(documento as never);
      const findByIdSpy = vi.spyOn(Funcionario, "findById").mockResolvedValue(documento as never);

      const { createApp } = await import("../../src/api/app.js");
      const app = createApp();
      const { port, close } = await listenOnce(app);

      try {
        const res = await fetch(`http://127.0.0.1:${port}${BASE}/funcionarios/${ID}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${adminToken()}` },
        });
        const body = (await res.json()) as { dados: { ativo: boolean } };

        expect(res.status).toBe(200);
        expect(body.dados.ativo).toBe(false);
        expect(findByIdAndUpdateSpy).toHaveBeenCalledWith(
          ID,
          { $set: { ativo: false } },
          { new: true },
        );

        const aindaExiste = await Funcionario.findById(ID);
        expect(aindaExiste).not.toBeNull();
        expect(aindaExiste!.ativo).toBe(false);
        expect(findByIdSpy).toHaveBeenCalled();
      } finally {
        await close();
      }
    });

    it("PATCH /regras-disponibilidade/:id atualiza atualizado_em", async () => {
      const RegraDisponibilidade = (
        await import("../../src/api/models/RegraDisponibilidade.model.js")
      ).default as unknown as {
        findByIdAndUpdate: (
          id: string,
          update: { $set: { atualizado_em: Date; hora_fim: string } },
          options?: { new: boolean; runValidators: boolean },
        ) => Promise<unknown>;
      };
      const antes = Date.now();
      const findByIdAndUpdateSpy = vi
        .spyOn(RegraDisponibilidade, "findByIdAndUpdate")
        .mockImplementation(
          (_id: string, update: { $set: { atualizado_em: Date; hora_fim: string } }) =>
            Promise.resolve({
              _id: ID,
              hora_fim: update.$set.hora_fim,
              atualizado_em: update.$set.atualizado_em,
            } as never),
        );

      const { createApp } = await import("../../src/api/app.js");
      const app = createApp();
      const { port, close } = await listenOnce(app);

      try {
        const res = await fetch(
          `http://127.0.0.1:${port}${BASE}/regras-disponibilidade/${ID}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${adminToken()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ hora_fim: "17:00" }),
          },
        );
        const body = (await res.json()) as { dados: { atualizado_em: string } };
        const chamada = findByIdAndUpdateSpy.mock.calls[0] as unknown as [
          string,
          { $set: { atualizado_em: Date; hora_fim: string } },
          { new: boolean; runValidators: boolean },
        ];

        expect(res.status).toBe(200);
        expect(chamada[0]).toBe(ID);
        expect(chamada[1].$set.hora_fim).toBe("17:00");
        expect(chamada[1].$set.atualizado_em).toBeInstanceOf(Date);
        expect(chamada[1].$set.atualizado_em.getTime()).toBeGreaterThanOrEqual(antes);
        expect(new Date(body.dados.atualizado_em).getTime()).toBe(
          chamada[1].$set.atualizado_em.getTime(),
        );
      } finally {
        await close();
      }
    });

    it("GET /servicos com perfil fora dos permitidos retorna 401 NAO_AUTENTICADO", async () => {
      const { createApp } = await import("../../src/api/app.js");
      const app = createApp();
      const { port, close } = await listenOnce(app);

      try {
        const res = await fetch(`http://127.0.0.1:${port}${BASE}/servicos`, {
          headers: { Authorization: `Bearer ${adminToken("gestor")}` },
        });
        const body = (await res.json()) as { erro: { codigo: string } };

        expect(res.status).toBe(401);
        expect(body.erro.codigo).toBe("NAO_AUTENTICADO");
      } finally {
        await close();
      }
    });

    it("GET /feriados com perfil atendente retorna 403 SEM_PERMISSAO", async () => {
      const { createApp } = await import("../../src/api/app.js");
      const app = createApp();
      const { port, close } = await listenOnce(app);

      try {
        const res = await fetch(`http://127.0.0.1:${port}${BASE}/feriados`, {
          headers: { Authorization: `Bearer ${adminToken("atendente")}` },
        });
        const body = (await res.json()) as { erro: { codigo: string } };

        expect(res.status).toBe(403);
        expect(body.erro.codigo).toBe("SEM_PERMISSAO");
      } finally {
        await close();
      }
    });
  },
  15_000,
);
