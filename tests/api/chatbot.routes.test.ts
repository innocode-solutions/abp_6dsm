import type { AddressInfo } from "node:net";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("dotenv", () => ({
  default: {
    config: vi.fn(),
  },
}));

const servicoFindMock = vi.fn();
const getHorariosDisponiveisMock = vi.fn();
const criarPreReservaMock = vi.fn();
const confirmarAgendamentoMock = vi.fn();
const consultarAgendamentoMock = vi.fn();
const cancelarAgendamentoMock = vi.fn();
const remarcarAgendamentoMock = vi.fn();

vi.mock("../../src/api/models/Servico.model.js", () => ({
  default: {
    find: (...args: unknown[]) => servicoFindMock(...args),
  },
}));

vi.mock("../../src/api/service/horario.service.js", () => ({
  getHorariosDisponiveis: (...args: unknown[]) => getHorariosDisponiveisMock(...args),
}));

vi.mock("../../src/api/service/preReserva.service.js", () => ({
  criarPreReserva: (...args: unknown[]) => criarPreReservaMock(...args),
}));

vi.mock("../../src/api/service/agendamento.service.js", () => ({
  confirmarAgendamento: (...args: unknown[]) => confirmarAgendamentoMock(...args),
  consultarAgendamento: (...args: unknown[]) => consultarAgendamentoMock(...args),
  cancelarAgendamento: (...args: unknown[]) => cancelarAgendamentoMock(...args),
  remarcarAgendamento: (...args: unknown[]) => remarcarAgendamentoMock(...args),
}));

const originalEnv = { ...process.env };
const API_KEY = "chatbot-test-key";
const BASE = "/api/v1/agendamentos";

function setMinimalValidEnv(): void {
  process.env.MONGO_URI = "mongodb://127.0.0.1:27017/test_db";
  process.env.JWT_SECRET = "jwt-test-secret";
  process.env.CHATBOT_API_KEY = API_KEY;
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

function authHeaders(): Record<string, string> {
  return { "x-api-key": API_KEY };
}

describe("rotas chatbot /api/v1/agendamentos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
    setMinimalValidEnv();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    vi.doUnmock("../../src/api/models/Servico.model.js");
    vi.doUnmock("../../src/api/service/horario.service.js");
    vi.doUnmock("../../src/api/service/preReserva.service.js");
    vi.doUnmock("../../src/api/service/agendamento.service.js");
    vi.resetModules();
  });

  it("GET /servicos sem x-api-key retorna 401 NAO_AUTENTICADO", async () => {
    const { createApp } = await import("../../src/api/app.js");
    const app = createApp();
    const { port, close } = await listenOnce(app);

    try {
      const res = await fetch(`http://127.0.0.1:${port}${BASE}/servicos`);
      const body = (await res.json()) as { erro: { codigo: string } };

      expect(res.status).toBe(401);
      expect(body.erro.codigo).toBe("NAO_AUTENTICADO");
      expect(servicoFindMock).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });

  it("GET /servicos com chave válida retorna 200 com lista", async () => {
    const servicos = [{ nome: "Atendimento", ativo: true }];
    servicoFindMock.mockResolvedValue(servicos);

    const { createApp } = await import("../../src/api/app.js");
    const app = createApp();
    const { port, close } = await listenOnce(app);

    try {
      const res = await fetch(`http://127.0.0.1:${port}${BASE}/servicos`, {
        headers: authHeaders(),
      });
      const body = (await res.json()) as {
        dados: typeof servicos;
        meta: { requisicao_id: string; timestamp: string };
      };

      expect(res.status).toBe(200);
      expect(body.dados).toEqual(servicos);
      expect(body.meta.requisicao_id).toBeTruthy();
      expect(servicoFindMock).toHaveBeenCalledWith({ ativo: true });
    } finally {
      await close();
    }
  });

  it("GET /horarios-disponiveis?servico_id=xxx retorna 200 com horários", async () => {
    const servicoId = new mongoose.Types.ObjectId().toString();
    const horarios = [{ _id: "h1", exibicao: { data: "20/05/2026", hora: "09:00" } }];
    getHorariosDisponiveisMock.mockResolvedValue(horarios);

    const { createApp } = await import("../../src/api/app.js");
    const app = createApp();
    const { port, close } = await listenOnce(app);

    try {
      const url = `http://127.0.0.1:${port}${BASE}/horarios-disponiveis?servico_id=${servicoId}&limite=3`;
      const res = await fetch(url, { headers: authHeaders() });
      const body = (await res.json()) as { dados: typeof horarios };

      expect(res.status).toBe(200);
      expect(body.dados).toEqual(horarios);
      expect(getHorariosDisponiveisMock).toHaveBeenCalledWith(servicoId, undefined, undefined, 3);
    } finally {
      await close();
    }
  });

  it("POST /pre-reservas com horário válido retorna 200 com pre_reserva_id", async () => {
    const horarioId = new mongoose.Types.ObjectId();
    const preReservaId = new mongoose.Types.ObjectId();
    criarPreReservaMock.mockResolvedValue({
      horario: { _id: horarioId },
      pre_reserva_id: preReservaId,
    });

    const { createApp } = await import("../../src/api/app.js");
    const app = createApp();
    const { port, close } = await listenOnce(app);

    const payload = {
      horario_id: horarioId.toString(),
      conversa_id: "conv-e2e",
      origem: "whatsapp",
      minutos_pre_reserva: 15,
    };

    try {
      const res = await fetch(`http://127.0.0.1:${port}${BASE}/pre-reservas`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as {
        dados: { pre_reserva_id: string; horario_id: string };
      };

      expect(res.status).toBe(200);
      expect(body.dados.pre_reserva_id).toBe(preReservaId.toString());
      expect(body.dados.horario_id).toBe(horarioId.toString());
      expect(criarPreReservaMock).toHaveBeenCalledWith(payload);
    } finally {
      await close();
    }
  });

  it("POST /agendamentos com pré-reserva válida retorna 201 com codigo_agendamento", async () => {
    confirmarAgendamentoMock.mockResolvedValue({
      codigo_agendamento: "AGD-2026-000042",
    });

    const { createApp } = await import("../../src/api/app.js");
    const app = createApp();
    const { port, close } = await listenOnce(app);

    const payload = {
      horario_id: new mongoose.Types.ObjectId().toString(),
      pre_reserva_id: new mongoose.Types.ObjectId().toString(),
      conversa_id: "conv-e2e",
      cidadao: { nome: "Maria", cpf: "52998224725" },
      assunto: "Reclamação",
      descricao: "Detalhes do caso",
    };

    try {
      const res = await fetch(`http://127.0.0.1:${port}${BASE}/agendamentos`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { dados: { codigo_agendamento: string } };

      expect(res.status).toBe(201);
      expect(body.dados.codigo_agendamento).toBe("AGD-2026-000042");
      expect(confirmarAgendamentoMock).toHaveBeenCalledWith(payload);
    } finally {
      await close();
    }
  });

  it("POST /:codigo/remarcar retorna 200 com novo codigo_agendamento", async () => {
    const codigoAnterior = "AGD-2026-000010";
    const codigoNovo = "AGD-2026-000011";
    const novoHorarioId = new mongoose.Types.ObjectId().toString();

    remarcarAgendamentoMock.mockResolvedValue({
      codigo_agendamento: codigoNovo,
    });

    const { createApp } = await import("../../src/api/app.js");
    const app = createApp();
    const { port, close } = await listenOnce(app);

    const payload = {
      novo_horario_id: novoHorarioId,
      conversa_id: "conv-remarcar",
      motivo: "Conflito de agenda",
    };

    try {
      const res = await fetch(
        `http://127.0.0.1:${port}${BASE}/${codigoAnterior}/remarcar`,
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = (await res.json()) as { dados: { codigo_agendamento: string } };

      expect(res.status).toBe(200);
      expect(body.dados.codigo_agendamento).toBe(codigoNovo);
      expect(remarcarAgendamentoMock).toHaveBeenCalledWith({
        codigo: codigoAnterior,
        ...payload,
      });
    } finally {
      await close();
    }
  });

  it("fluxo completo: serviço → horário → pré-reserva → confirmação → consulta → cancelamento", async () => {
    const servicoId = new mongoose.Types.ObjectId().toString();
    const horarioId = new mongoose.Types.ObjectId();
    const preReservaId = new mongoose.Types.ObjectId();
    const codigo = "AGD-2026-000099";
    const conversaId = "conv-fluxo";

    servicoFindMock.mockResolvedValue([{ _id: servicoId, nome: "Orientação", ativo: true }]);
    getHorariosDisponiveisMock.mockResolvedValue([
      { _id: horarioId.toString(), servico_id: servicoId, status: "disponivel" },
    ]);
    criarPreReservaMock.mockResolvedValue({
      horario: { _id: horarioId },
      pre_reserva_id: preReservaId,
    });
    confirmarAgendamentoMock.mockResolvedValue({ codigo_agendamento: codigo });
    consultarAgendamentoMock.mockResolvedValue({
      codigo_agendamento: codigo,
      status: "confirmado",
      conversa_id: conversaId,
    });
    cancelarAgendamentoMock.mockResolvedValue({
      codigo_agendamento: codigo,
      status: "cancelado",
    });

    const { createApp } = await import("../../src/api/app.js");
    const app = createApp();
    const { port, close } = await listenOnce(app);
    const origin = `http://127.0.0.1:${port}${BASE}`;
    const headers = { ...authHeaders(), "Content-Type": "application/json" };

    try {
      const resServicos = await fetch(`${origin}/servicos`, { headers: authHeaders() });
      expect(resServicos.status).toBe(200);

      const resHorarios = await fetch(
        `${origin}/horarios-disponiveis?servico_id=${servicoId}`,
        { headers: authHeaders() },
      );
      expect(resHorarios.status).toBe(200);

      const resPreReserva = await fetch(`${origin}/pre-reservas`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          horario_id: horarioId.toString(),
          conversa_id: conversaId,
          origem: "whatsapp",
          minutos_pre_reserva: 15,
        }),
      });
      const preReservaBody = (await resPreReserva.json()) as {
        dados: { pre_reserva_id: string };
      };
      expect(resPreReserva.status).toBe(200);
      expect(preReservaBody.dados.pre_reserva_id).toBe(preReservaId.toString());

      const resAgendamento = await fetch(`${origin}/agendamentos`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          horario_id: horarioId.toString(),
          pre_reserva_id: preReservaBody.dados.pre_reserva_id,
          conversa_id: conversaId,
          cidadao: { nome: "João", cpf: "52998224725" },
          assunto: "Assunto",
          descricao: "Descrição",
        }),
      });
      const agendamentoBody = (await resAgendamento.json()) as {
        dados: { codigo_agendamento: string };
      };
      expect(resAgendamento.status).toBe(201);
      expect(agendamentoBody.dados.codigo_agendamento).toBe(codigo);

      const resConsulta = await fetch(`${origin}/${codigo}`, { headers: authHeaders() });
      const consultaBody = (await resConsulta.json()) as {
        dados: { codigo_agendamento: string; status: string };
      };
      expect(resConsulta.status).toBe(200);
      expect(consultaBody.dados.codigo_agendamento).toBe(codigo);

      const resCancelar = await fetch(`${origin}/${codigo}/cancelar`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          motivo: "Desistência",
          conversa_id: conversaId,
          cancelado_por: { tipo: "sistema", id: conversaId },
        }),
      });
      const cancelarBody = (await resCancelar.json()) as {
        dados: { status: string };
      };
      expect(resCancelar.status).toBe(200);
      expect(cancelarBody.dados.status).toBe("cancelado");
    } finally {
      await close();
    }
  });
});
