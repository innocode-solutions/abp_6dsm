import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const regraFindMock = vi.fn();
const feriadoFindMock = vi.fn();
const bloqueioFindMock = vi.fn();
const horarioFindMock = vi.fn();
const horarioInsertManyMock = vi.fn();

vi.mock("../../../src/api/models/RegraDisponibilidade.model.js", () => ({
  default: {
    find: (...args: unknown[]) => regraFindMock(...args),
  },
}));

vi.mock("../../../src/api/models/Feriado.model.js", () => ({
  default: {
    find: (...args: unknown[]) => feriadoFindMock(...args),
  },
}));

vi.mock("../../../src/api/models/Bloqueio.model.js", () => ({
  default: {
    find: (...args: unknown[]) => bloqueioFindMock(...args),
  },
}));

vi.mock("../../../src/api/models/Horario.model.js", () => ({
  default: {
    find: (...args: unknown[]) => horarioFindMock(...args),
    insertMany: (...args: unknown[]) => horarioInsertManyMock(...args),
  },
}));

const listarIdsFuncionariosAtivosMock = vi.fn();
const listarIdsServicosAtivosMock = vi.fn();

vi.mock("../../../src/api/service/validacao/referencias.service.js", () => ({
  listarIdsFuncionariosAtivos: (...args: unknown[]) => listarIdsFuncionariosAtivosMock(...args),
  listarIdsServicosAtivos: (...args: unknown[]) => listarIdsServicosAtivosMock(...args),
}));

describe("horario.service gerarHorarios", () => {
  const funcionarioId = new mongoose.Types.ObjectId();
  const servicoId = new mongoose.Types.ObjectId();
  const criadoPor = new mongoose.Types.ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
    listarIdsFuncionariosAtivosMock.mockResolvedValue([funcionarioId]);
    listarIdsServicosAtivosMock.mockResolvedValue([servicoId]);
    feriadoFindMock.mockReturnValue({ lean: () => Promise.resolve([]) });
    bloqueioFindMock.mockReturnValue({ lean: () => Promise.resolve([]) });
    horarioFindMock.mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve([]),
      }),
    });
    horarioInsertManyMock.mockResolvedValue([]);
  });

  it("gera slots para intervalo de 7 dias com regra ativa de segunda a sexta", async () => {
    regraFindMock.mockReturnValue({
      lean: () =>
        Promise.resolve([
          {
            funcionario_id: funcionarioId,
            servico_id: servicoId,
            dia_semana: 1,
            hora_inicio: "09:00",
            hora_fim: "10:00",
            duracao_horario_minutos: 30,
            ativo: true,
          },
          {
            funcionario_id: funcionarioId,
            servico_id: servicoId,
            dia_semana: 2,
            hora_inicio: "09:00",
            hora_fim: "10:00",
            duracao_horario_minutos: 30,
            ativo: true,
          },
          {
            funcionario_id: funcionarioId,
            servico_id: servicoId,
            dia_semana: 3,
            hora_inicio: "09:00",
            hora_fim: "10:00",
            duracao_horario_minutos: 30,
            ativo: true,
          },
          {
            funcionario_id: funcionarioId,
            servico_id: servicoId,
            dia_semana: 4,
            hora_inicio: "09:00",
            hora_fim: "10:00",
            duracao_horario_minutos: 30,
            ativo: true,
          },
          {
            funcionario_id: funcionarioId,
            servico_id: servicoId,
            dia_semana: 5,
            hora_inicio: "09:00",
            hora_fim: "10:00",
            duracao_horario_minutos: 30,
            ativo: true,
          },
        ]),
    });

    const { gerarHorarios } = await import("../../../src/api/service/horario.service.js");

    const de = new Date("2026-06-01T03:00:00.000Z");
    const ate = new Date("2026-06-07T03:00:00.000Z");

    const resultado = await gerarHorarios(de, ate, criadoPor);

    expect(resultado.horarios_criados).toBeGreaterThan(0);
    expect(horarioInsertManyMock).toHaveBeenCalledTimes(1);

    const inseridos = horarioInsertManyMock.mock.calls[0][0] as Array<{
      status: string;
      funcionario_id: mongoose.Types.ObjectId;
    }>;

    expect(inseridos.length).toBe(resultado.horarios_criados);
    expect(inseridos.every((h) => h.status === "disponivel")).toBe(true);
    expect(inseridos.every((h) => h.funcionario_id.equals(funcionarioId))).toBe(true);
  });

  it("ignora horários já existentes no mesmo início", async () => {
    const slotInicio = new Date("2026-06-02T12:00:00.000Z");

    regraFindMock.mockReturnValue({
      lean: () =>
        Promise.resolve([
          {
            funcionario_id: funcionarioId,
            servico_id: servicoId,
            dia_semana: 2,
            hora_inicio: "09:00",
            hora_fim: "10:00",
            duracao_horario_minutos: 30,
            ativo: true,
          },
        ]),
    });

    horarioFindMock.mockReturnValue({
      select: () => ({
        lean: () =>
          Promise.resolve([
            {
              funcionario_id: funcionarioId,
              servico_id: servicoId,
              inicio_em: slotInicio,
            },
          ]),
      }),
    });

    const { gerarHorarios } = await import("../../../src/api/service/horario.service.js");

    const resultado = await gerarHorarios(
      new Date("2026-06-01T03:00:00.000Z"),
      new Date("2026-06-03T03:00:00.000Z"),
      criadoPor,
    );

    const inseridos = horarioInsertManyMock.mock.calls[0]?.[0] as unknown[] | undefined;
    if (inseridos) {
      expect(
        inseridos.some(
          (h) =>
            (h as { inicio_em: Date }).inicio_em.toISOString() === slotInicio.toISOString(),
        ),
      ).toBe(false);
    }

    expect(resultado.horarios_criados).toBeLessThanOrEqual(
      (inseridos?.length ?? 0) + 1,
    );
  });
});
