import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const aggregateMock = vi.fn();

vi.mock("../../../src/api/models/Horario.model.js", () => ({
  default: {
    aggregate: (...args: unknown[]) => aggregateMock(...args),
  },
}));

const assertServicoExisteEAtivoMock = vi.fn();
const listarIdsFuncionariosAtivosMock = vi.fn();

vi.mock("../../../src/api/service/validacao/referencias.service.js", () => ({
  assertServicoExisteEAtivo: (...args: unknown[]) => assertServicoExisteEAtivoMock(...args),
  listarIdsFuncionariosAtivos: (...args: unknown[]) => listarIdsFuncionariosAtivosMock(...args),
}));

describe("horario.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertServicoExisteEAtivoMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function getAggregatePipeline(): Array<Record<string, unknown>> {
    return aggregateMock.mock.calls[0][0] as Array<Record<string, unknown>>;
  }

  function getAggregateMatch(): {
    inicio_em: { $gte: Date; $lte: Date };
  } {
    const matchStage = getAggregatePipeline().find((stage) => "$match" in stage) as {
      $match: { inicio_em: { $gte: Date; $lte: Date } };
    };
    return matchStage.$match;
  }

  it("retorna horarios disponiveis com campo exibicao", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-11T13:00:00.000Z"));

    const servicoId = new mongoose.Types.ObjectId();
    const funcionarioId = new mongoose.Types.ObjectId();
    const inicio = new Date("2026-05-25T14:00:00.000Z");

    listarIdsFuncionariosAtivosMock.mockResolvedValue([funcionarioId]);

    aggregateMock.mockResolvedValue([
      {
        _id: new mongoose.Types.ObjectId(),
        funcionario_id: funcionarioId,
        servico_id: servicoId,
        inicio_em: inicio,
        fim_em: new Date("2026-05-25T14:30:00.000Z"),
        status: "disponivel",
      },
    ]);

    const { getHorariosDisponiveis } = await import(
      "../../../src/api/service/horario.service.js"
    );
    const resultado = await getHorariosDisponiveis(servicoId);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].exibicao.data).toBe("25/05/2026");
    expect(resultado[0].exibicao.hora).toMatch(/^\d{2}:\d{2}$/);
    expect(resultado[0].exibicao.dia_semana).toBe("segunda-feira");

    const match = getAggregateMatch();
    expect(match.inicio_em.$gte.toISOString()).toBe("2026-06-11T15:00:00.000Z");
    expect(aggregateMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          $group: expect.objectContaining({
            _id: "$inicio_em",
          }),
        }),
        { $limit: 5 },
      ]),
    );
  });

  it("preserva o intervalo inicial quando de e informado explicitamente", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-11T13:00:00.000Z"));

    const servicoId = new mongoose.Types.ObjectId();
    const funcionarioId = new mongoose.Types.ObjectId();
    const de = new Date("2026-06-12T12:00:00.000Z");

    listarIdsFuncionariosAtivosMock.mockResolvedValue([funcionarioId]);
    aggregateMock.mockResolvedValue([]);

    const { getHorariosDisponiveis } = await import(
      "../../../src/api/service/horario.service.js"
    );
    await getHorariosDisponiveis(servicoId, de);

    const match = getAggregateMatch();
    expect(match.inicio_em.$gte).toEqual(de);
  });

  it("mantem busca futura automatica quando o dia atual ja nao tem horarios validos", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-11T19:00:00.000Z"));

    const servicoId = new mongoose.Types.ObjectId();
    const funcionarioId = new mongoose.Types.ObjectId();
    const proximoDia = new Date("2026-06-12T12:00:00.000Z");

    listarIdsFuncionariosAtivosMock.mockResolvedValue([funcionarioId]);
    aggregateMock.mockResolvedValue([
      {
        _id: new mongoose.Types.ObjectId(),
        funcionario_id: funcionarioId,
        servico_id: servicoId,
        inicio_em: proximoDia,
        fim_em: new Date("2026-06-12T12:30:00.000Z"),
        status: "disponivel",
      },
    ]);

    const { getHorariosDisponiveis } = await import(
      "../../../src/api/service/horario.service.js"
    );
    const resultado = await getHorariosDisponiveis(servicoId);

    const match = getAggregateMatch();
    expect(match.inicio_em.$gte.toISOString()).toBe("2026-06-11T21:00:00.000Z");
    expect(match.inicio_em.$lte.getTime()).toBeGreaterThan(proximoDia.getTime());
    expect(resultado[0].inicio_em).toEqual(proximoDia);
  });

  it("aplica o limite solicitado e agrupa horarios repetidos pelo mesmo inicio", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-11T13:00:00.000Z"));

    const servicoId = new mongoose.Types.ObjectId();
    const funcionarioId = new mongoose.Types.ObjectId();

    listarIdsFuncionariosAtivosMock.mockResolvedValue([funcionarioId]);
    aggregateMock.mockResolvedValue([]);

    const { getHorariosDisponiveis } = await import(
      "../../../src/api/service/horario.service.js"
    );
    await getHorariosDisponiveis(servicoId, undefined, undefined, 10);

    expect(getAggregatePipeline()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $group: expect.objectContaining({
            _id: "$inicio_em",
            horario: { $first: "$$ROOT" },
          }),
        }),
        { $limit: 10 },
      ]),
    );
  });
});
