import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const horarioFindOneAndUpdateMock = vi.fn();
const horarioUpdateOneMock = vi.fn();
const agendamentoExistsMock = vi.fn();
const agendamentoFindOneMock = vi.fn();
const agendamentoCreateMock = vi.fn();
const generateProtocoloMock = vi.fn();
const registrarAuditoriaMock = vi.fn();

vi.mock("../../../src/api/models/Horario.model.js", () => ({
  default: {
    findOneAndUpdate: (...args: unknown[]) => horarioFindOneAndUpdateMock(...args),
    updateOne: (...args: unknown[]) => horarioUpdateOneMock(...args),
  },
}));

vi.mock("../../../src/api/models/Agendamento.model.js", () => ({
  default: {
    exists: (...args: unknown[]) => agendamentoExistsMock(...args),
    findOne: (...args: unknown[]) => agendamentoFindOneMock(...args),
    create: (...args: unknown[]) => agendamentoCreateMock(...args),
  },
}));

vi.mock("../../../src/api/service/protocolo.service.js", () => ({
  generateProtocolo: (...args: unknown[]) => generateProtocoloMock(...args),
}));

vi.mock("../../../src/api/service/auditoria.service.js", () => ({
  registrarAuditoria: (...args: unknown[]) => registrarAuditoriaMock(...args),
}));

function horarioBase(overrides: Record<string, unknown> = {}) {
  const id = new mongoose.Types.ObjectId();
  return {
    _id: id,
    servico_id: new mongoose.Types.ObjectId(),
    funcionario_id: new mongoose.Types.ObjectId(),
    inicio_em: new Date(Date.now() + 24 * 60 * 60 * 1000),
    fim_em: new Date(Date.now() + 25 * 60 * 60 * 1000),
    status: "pre_reservado",
    ...overrides,
  };
}

function agendamentoDoc(overrides: Record<string, unknown> = {}) {
  const inicio = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return {
    codigo_agendamento: "AGD-2026-000010",
    cidadao: { nome: "Maria", cpf: "11111111111" },
    servico_id: new mongoose.Types.ObjectId(),
    funcionario_id: new mongoose.Types.ObjectId(),
    horario_id: new mongoose.Types.ObjectId(),
    status: "confirmado",
    inicio_em: inicio,
    fim_em: new Date(inicio.getTime() + 30 * 60 * 1000),
    assunto: "Assunto",
    descricao: "Descrição",
    origem: "whatsapp",
    conversa_id: "conv-1",
    remarcacoes_count: 0,
    toObject: () => ({ codigo_agendamento: "AGD-2026-000010" }),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("agendamento.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agendamentoExistsMock.mockResolvedValue(null);
    horarioUpdateOneMock.mockResolvedValue({});
    generateProtocoloMock.mockResolvedValue("AGD-2026-000099");
    registrarAuditoriaMock.mockResolvedValue(undefined);
  });

  it("confirmarAgendamento com pré-reserva expirada retorna PRE_RESERVA_EXPIRADA", async () => {
    horarioFindOneAndUpdateMock.mockResolvedValue(null);

    const { confirmarAgendamento } = await import(
      "../../../src/api/service/agendamento.service.js"
    );

    await expect(
      confirmarAgendamento({
        horario_id: new mongoose.Types.ObjectId(),
        pre_reserva_id: new mongoose.Types.ObjectId(),
        conversa_id: "conv-1",
        cidadao: { nome: "João", cpf: "52998224725" },
        assunto: "Reclamação",
        descricao: "Detalhes",
      }),
    ).rejects.toMatchObject({ codigo: "PRE_RESERVA_EXPIRADA", httpStatus: 409 });
  });

  it("confirmarAgendamento com CPF ativo retorna AGENDAMENTO_DUPLICADO", async () => {
    agendamentoExistsMock.mockResolvedValue({ _id: "x" });

    const { confirmarAgendamento } = await import(
      "../../../src/api/service/agendamento.service.js"
    );

    await expect(
      confirmarAgendamento({
        horario_id: new mongoose.Types.ObjectId(),
        pre_reserva_id: new mongoose.Types.ObjectId(),
        conversa_id: "conv-1",
        cidadao: { nome: "João", cpf: "529.982.247-25" },
        assunto: "Reclamação",
        descricao: "Detalhes",
      }),
    ).rejects.toMatchObject({ codigo: "AGENDAMENTO_DUPLICADO", httpStatus: 409 });

    expect(horarioFindOneAndUpdateMock).not.toHaveBeenCalled();
  });

  it("cancelar com menos de 2h de antecedência retorna CANCELAMENTO_FORA_DO_PRAZO", async () => {
    const inicioProximo = new Date(Date.now() + 60 * 60 * 1000);
    agendamentoFindOneMock.mockResolvedValue(
      agendamentoDoc({
        inicio_em: inicioProximo,
        fim_em: new Date(inicioProximo.getTime() + 30 * 60 * 1000),
      }),
    );

    const { cancelarAgendamento } = await import(
      "../../../src/api/service/agendamento.service.js"
    );

    await expect(
      cancelarAgendamento({
        codigo: "AGD-2026-000010",
        motivo: "Indisponível",
        cancelado_por: { tipo: "sistema", id: "conv-1" },
        conversa_id: "conv-1",
      }),
    ).rejects.toMatchObject({ codigo: "CANCELAMENTO_FORA_DO_PRAZO", httpStatus: 409 });
  });

  it("remarcar na 3ª vez retorna REMARCACAO_FORA_DO_PRAZO", async () => {
    agendamentoFindOneMock.mockResolvedValue(
      agendamentoDoc({ remarcacoes_count: 2 }),
    );

    const { remarcarAgendamento } = await import(
      "../../../src/api/service/agendamento.service.js"
    );

    await expect(
      remarcarAgendamento({
        codigo: "AGD-2026-000010",
        novo_horario_id: new mongoose.Types.ObjectId(),
        conversa_id: "conv-1",
        motivo: "Conflito de agenda",
      }),
    ).rejects.toMatchObject({ codigo: "REMARCACAO_FORA_DO_PRAZO", httpStatus: 409 });

    expect(horarioFindOneAndUpdateMock).not.toHaveBeenCalled();
  });

  it("consultarAgendamento inexistente retorna AGENDAMENTO_NAO_ENCONTRADO", async () => {
    agendamentoFindOneMock.mockReturnValue({
      lean: () => Promise.resolve(null),
    });

    const { consultarAgendamento } = await import(
      "../../../src/api/service/agendamento.service.js"
    );

    await expect(consultarAgendamento("AGD-2026-999999")).rejects.toMatchObject({
      codigo: "AGENDAMENTO_NAO_ENCONTRADO",
      httpStatus: 404,
    });
  });

  it("confirmarAgendamento cria agendamento quando pré-reserva é válida", async () => {
    const horario = horarioBase();
    const preReservaId = new mongoose.Types.ObjectId();
    horarioFindOneAndUpdateMock.mockResolvedValue(horario);
    agendamentoCreateMock.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      codigo_agendamento: "AGD-2026-000099",
    });

    const { confirmarAgendamento } = await import(
      "../../../src/api/service/agendamento.service.js"
    );

    await confirmarAgendamento({
      horario_id: horario._id,
      pre_reserva_id: preReservaId,
      conversa_id: "conv-1",
      cidadao: { nome: "João", cpf: "52998224725" },
      assunto: "Reclamação",
      descricao: "Detalhes",
    });

    expect(agendamentoCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        codigo_agendamento: "AGD-2026-000099",
        status: "confirmado",
        cidadao: { nome: "João", cpf: "52998224725" },
      }),
    );
    expect(registrarAuditoriaMock).toHaveBeenCalled();
  });
});
