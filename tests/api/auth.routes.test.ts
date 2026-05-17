import type { AddressInfo } from "node:net";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
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

const funcionarioFindOneMock = vi.fn();
const funcionarioCreateMock = vi.fn();

vi.mock("../../src/api/models/Funcionario.model.js", () => ({
  FUNCIONARIO_PERFIS: ["admin", "atendente"],
  default: {
    findOne: (...args: unknown[]) => funcionarioFindOneMock(...args),
    create: (...args: unknown[]) => funcionarioCreateMock(...args),
  },
}));

const originalEnv = { ...process.env };

function setMinimalValidEnv(): void {
  process.env.MONGO_URI = "mongodb://127.0.0.1:27017/test_db";
  process.env.JWT_SECRET = "jwt-test-secret";
  process.env.CHATBOT_API_KEY = "chatbot-test-key";
}

function listenOnce(
  app: express.Application,
): Promise<{ port: number; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("endereco do servidor invalido"));
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

function mockFindOneResult(funcionario: unknown): void {
  funcionarioFindOneMock.mockReturnValue({
    select: vi.fn().mockResolvedValue(funcionario),
  });
}

describe("rotas de auth do portal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
    setMinimalValidEnv();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("POST /api/v1/auth/login retorna token e usuario sem senha_hash", async () => {
    const { hashSenha } = await import("../../src/api/utils/passwordHelper.js");
    const senhaHash = await hashSenha("senha-segura");
    const funcionarioId = new mongoose.Types.ObjectId();

    mockFindOneResult({
      _id: funcionarioId,
      nome: "Maria",
      email: "maria@procon.test",
      senha_hash: senhaHash,
      perfil: "atendente",
      ativo: true,
    });

    const { createApp } = await import("../../src/api/app.js");
    const app = createApp();
    const { port, close } = await listenOnce(app);

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "MARIA@PROCON.TEST",
          senha: "senha-segura",
        }),
      });
      const body = (await res.json()) as {
        dados: {
          token: string;
          usuario: {
            id: string;
            nome: string;
            email: string;
            perfil: string;
            senha_hash?: string;
          };
        };
      };

      expect(res.status).toBe(200);
      expect(body.dados.token).toBeTruthy();
      expect(body.dados.usuario).toEqual({
        id: funcionarioId.toString(),
        nome: "Maria",
        email: "maria@procon.test",
        perfil: "atendente",
      });
      expect(body.dados.usuario.senha_hash).toBeUndefined();
      expect(funcionarioFindOneMock).toHaveBeenCalledWith({
        email: "maria@procon.test",
      });

      const decoded = jwt.verify(body.dados.token, "jwt-test-secret") as {
        id: string;
        perfil: string;
      };
      expect(decoded.id).toBe(funcionarioId.toString());
      expect(decoded.perfil).toBe("atendente");
    } finally {
      await close();
    }
  });

  it("token gerado no login e aceito pelo middleware administrativo", async () => {
    const { hashSenha } = await import("../../src/api/utils/passwordHelper.js");
    const senhaHash = await hashSenha("senha-admin");
    const funcionarioId = new mongoose.Types.ObjectId();

    mockFindOneResult({
      _id: funcionarioId,
      nome: "Ana Admin",
      email: "ana@procon.test",
      senha_hash: senhaHash,
      perfil: "admin",
      ativo: true,
    });

    const { createApp } = await import("../../src/api/app.js");
    const app = createApp();
    const { port, close } = await listenOnce(app);

    let token = "";
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "ana@procon.test", senha: "senha-admin" }),
      });
      const body = (await res.json()) as { dados: { token: string } };
      token = body.dados.token;
    } finally {
      await close();
    }

    const { authenticateAdmin } = await import("../../src/api/middleware/auth.middleware.js");
    const { errorHandler } = await import("../../src/api/middleware/errorHandler.middleware.js");

    const protectedApp = express();
    protectedApp.get("/protegida", authenticateAdmin, (req, res) => {
      res.status(200).json({ usuario: req.usuario });
    });
    protectedApp.use(errorHandler);

    const protectedServer = await listenOnce(protectedApp);
    try {
      const res = await fetch(`http://127.0.0.1:${protectedServer.port}/protegida`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json()) as {
        usuario: { id: string; perfil: string; tipo: string };
      };

      expect(res.status).toBe(200);
      expect(body.usuario).toEqual({
        id: funcionarioId.toString(),
        perfil: "admin",
        tipo: "admin",
      });
    } finally {
      await protectedServer.close();
    }
  });

  it("login com senha incorreta retorna 401 NAO_AUTENTICADO", async () => {
    const { hashSenha } = await import("../../src/api/utils/passwordHelper.js");
    const senhaHash = await hashSenha("senha-correta");

    mockFindOneResult({
      _id: new mongoose.Types.ObjectId(),
      nome: "Maria",
      email: "maria@procon.test",
      senha_hash: senhaHash,
      perfil: "atendente",
      ativo: true,
    });

    const { createApp } = await import("../../src/api/app.js");
    const app = createApp();
    const { port, close } = await listenOnce(app);

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "maria@procon.test", senha: "errada" }),
      });
      const body = (await res.json()) as { erro: { codigo: string } };

      expect(res.status).toBe(401);
      expect(body.erro.codigo).toBe("NAO_AUTENTICADO");
    } finally {
      await close();
    }
  });

  it("login com funcionario inexistente ou inativo retorna 401 NAO_AUTENTICADO", async () => {
    mockFindOneResult(null);

    const { createApp } = await import("../../src/api/app.js");
    const app = createApp();
    const { port, close } = await listenOnce(app);

    try {
      const resInexistente = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "ninguem@procon.test", senha: "senha" }),
      });
      const bodyInexistente = (await resInexistente.json()) as { erro: { codigo: string } };

      expect(resInexistente.status).toBe(401);
      expect(bodyInexistente.erro.codigo).toBe("NAO_AUTENTICADO");

      mockFindOneResult({
        _id: new mongoose.Types.ObjectId(),
        nome: "Usuario Inativo",
        email: "inativo@procon.test",
        senha_hash: "hash-invalido",
        perfil: "admin",
        ativo: false,
      });

      const resInativo = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "inativo@procon.test", senha: "senha" }),
      });
      const bodyInativo = (await resInativo.json()) as { erro: { codigo: string } };

      expect(resInativo.status).toBe(401);
      expect(bodyInativo.erro.codigo).toBe("NAO_AUTENTICADO");

      mockFindOneResult({
        _id: new mongoose.Types.ObjectId(),
        nome: "Usuario Legado",
        email: "legado@procon.test",
        perfil: "admin",
        ativo: true,
      });

      const resLegado = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "legado@procon.test", senha: "senha" }),
      });
      const bodyLegado = (await resLegado.json()) as { erro: { codigo: string } };

      expect(resLegado.status).toBe(401);
      expect(bodyLegado.erro.codigo).toBe("NAO_AUTENTICADO");
    } finally {
      await close();
    }
  });

  it("POST /funcionarios exige senha, salva hash e nao retorna senha_hash", async () => {
    const funcionarioId = new mongoose.Types.ObjectId();
    funcionarioCreateMock.mockImplementation((dados: Record<string, unknown>) =>
      Promise.resolve({
        _id: funcionarioId,
        nome: dados.nome,
        email: dados.email,
        perfil: dados.perfil,
        ativo: true,
        senha_hash: dados.senha_hash,
        toObject: () => ({
          _id: funcionarioId.toString(),
          nome: dados.nome,
          email: dados.email,
          perfil: dados.perfil,
          ativo: true,
          senha_hash: dados.senha_hash,
        }),
      }),
    );

    const { createApp } = await import("../../src/api/app.js");
    const app = createApp();
    const { port, close } = await listenOnce(app);
    const token = jwt.sign({ id: "admin-1", perfil: "admin" }, "jwt-test-secret");

    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/v1/agendamentos/admin/funcionarios`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nome: "Joao",
            email: "joao@procon.test",
            perfil: "atendente",
            senha: "senha-inicial",
          }),
        },
      );
      const body = (await res.json()) as {
        dados: {
          nome: string;
          email: string;
          perfil: string;
          senha_hash?: string;
        };
      };

      expect(res.status).toBe(201);
      expect(funcionarioCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: "Joao",
          email: "joao@procon.test",
          perfil: "atendente",
          senha_hash: expect.any(String),
        }),
      );
      expect(funcionarioCreateMock.mock.calls[0][0]).not.toHaveProperty("senha");
      expect(body.dados).toMatchObject({
        nome: "Joao",
        email: "joao@procon.test",
        perfil: "atendente",
      });
      expect(body.dados.senha_hash).toBeUndefined();
    } finally {
      await close();
    }
  });
});
