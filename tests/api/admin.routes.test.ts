import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("dotenv", () => ({
  default: {
    config: vi.fn(),
  },
}));

vi.mock("../../src/api/config/env.js", () => ({
  env: {
    PORT: 3000,
    MONGODB_URI: "mongodb://127.0.0.1:27017/test_db",
    JWT_SECRET: "jwt-test-secret",
    CHATBOT_API_KEY: "chatbot-test-key",
  },
}));

const listarAgendaMock = vi.fn();
const criarBloqueioMock = vi.fn();
const gerarHorariosMock = vi.fn();

vi.mock("../../src/api/service/agenda.service.js", () => ({
  listarAgenda: (...args: unknown[]) => listarAgendaMock(...args),
  parseDataAgenda: (value: string) => new Date(`${value}T00:00:00.000Z`),
}));

vi.mock("../../src/api/service/bloqueio.service.js", () => ({
  criarBloqueio: (...args: unknown[]) => criarBloqueioMock(...args),
  removerBloqueio: vi.fn(),
}));

vi.mock("../../src/api/service/checkin.service.js", () => ({
  realizarCheckIn: vi.fn(),
  marcarNaoCompareceu: vi.fn(),
  concluirAtendimento: vi.fn(),
}));

vi.mock("../../src/api/service/horario.service.js", () => ({
  gerarHorarios: (...args: unknown[]) => gerarHorariosMock(...args),
  listarHorariosAdmin: vi.fn(),
  getHorariosDisponiveis: vi.fn(),
}));

const originalEnv = { ...process.env };
const BASE = "/api/v1/agendamentos/admin";

function setMinimalValidEnv(): void {
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/test_db";
  process.env.JWT_SECRET = "jwt-test-secret";
  process.env.CHATBOT_API_KEY = "chatbot-test-key";
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

describe("rotas admin /api/v1/agendamentos/admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
    setMinimalValidEnv();
    listarAgendaMock.mockResolvedValue([]);
    criarBloqueioMock.mockResolvedValue({ bloqueio_id: "b1", horarios_afetados: 2 });
    gerarHorariosMock.mockResolvedValue({ horarios_criados: 14, de: new Date(), ate: new Date() });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    vi.doUnmock("../../src/api/config/env.js");
    vi.doUnmock("../../src/api/service/agenda.service.js");
    vi.doUnmock("../../src/api/service/bloqueio.service.js");
    vi.doUnmock("../../src/api/service/checkin.service.js");
    vi.doUnmock("../../src/api/service/horario.service.js");
    vi.resetModules();
  });

  it("GET /agenda sem JWT retorna 401 NAO_AUTENTICADO", async () => {
    const { createApp } = await import("../../src/api/app.js");
    const app = createApp();
    const { port, close } = await listenOnce(app);

    try {
      const res = await fetch(`http://127.0.0.1:${port}${BASE}/agenda`);
      const body = (await res.json()) as { erro: { codigo: string } };

      expect(res.status).toBe(401);
      expect(body.erro.codigo).toBe("NAO_AUTENTICADO");
      expect(listarAgendaMock).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });

  it("GET /agenda com perfil atendente retorna 200", async () => {
    const { createApp } = await import("../../src/api/app.js");
    const token = jwt.sign({ id: "func-1", perfil: "atendente" }, "jwt-test-secret");
    const app = createApp();
    const { port, close } = await listenOnce(app);

    try {
      const res = await fetch(`http://127.0.0.1:${port}${BASE}/agenda`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json()) as { dados: unknown[] };

      expect(res.status).toBe(200);
      expect(body.dados).toEqual([]);
      expect(listarAgendaMock).toHaveBeenCalled();
    } finally {
      await close();
    }
  });

  it("POST /bloqueios com perfil atendente retorna 403 SEM_PERMISSAO", async () => {
    const { createApp } = await import("../../src/api/app.js");
    const token = jwt.sign({ id: "func-2", perfil: "atendente" }, "jwt-test-secret");
    const app = createApp();
    const { port, close } = await listenOnce(app);

    try {
      const res = await fetch(`http://127.0.0.1:${port}${BASE}/bloqueios`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          funcionario_id: "507f1f77bcf86cd799439011",
          inicio_em: "2026-06-01T10:00:00.000Z",
          fim_em: "2026-06-01T12:00:00.000Z",
          motivo: "Reunião",
        }),
      });
      const body = (await res.json()) as { erro: { codigo: string } };

      expect(res.status).toBe(403);
      expect(body.erro.codigo).toBe("SEM_PERMISSAO");
      expect(criarBloqueioMock).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });

  it("POST /horarios/gerar com perfil admin retorna 201", async () => {
    const { createApp } = await import("../../src/api/app.js");
    const token = jwt.sign({ id: "func-3", perfil: "admin" }, "jwt-test-secret");
    const app = createApp();
    const { port, close } = await listenOnce(app);

    try {
      const res = await fetch(`http://127.0.0.1:${port}${BASE}/horarios/gerar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          de: "2026-06-01",
          ate: "2026-06-07",
        }),
      });
      const body = (await res.json()) as { dados: { horarios_criados: number } };

      expect(res.status).toBe(201);
      expect(body.dados.horarios_criados).toBe(14);
      expect(gerarHorariosMock).toHaveBeenCalled();
    } finally {
      await close();
    }
  });
});
