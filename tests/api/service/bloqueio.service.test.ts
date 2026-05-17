import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const bloqueioCreateMock = vi.fn();
const bloqueioFindByIdAndDeleteMock = vi.fn();
const horarioUpdateManyMock = vi.fn();

vi.mock("../../../src/api/models/Bloqueio.model.js", () => ({
  default: {
    create: (...args: unknown[]) => bloqueioCreateMock(...args),
    findByIdAndDelete: (...args: unknown[]) => bloqueioFindByIdAndDeleteMock(...args),
  },
}));

vi.mock("../../../src/api/models/Horario.model.js", () => ({
  default: {
    updateMany: (...args: unknown[]) => horarioUpdateManyMock(...args),
  },
}));

describe("bloqueio.service", () => {
  const funcionarioId = new mongoose.Types.ObjectId();
  const criadoPorId = new mongoose.Types.ObjectId();
  const bloqueioId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
    horarioUpdateManyMock.mockResolvedValue({ modifiedCount: 2 });
    bloqueioCreateMock.mockResolvedValue({ _id: bloqueioId });
    bloqueioFindByIdAndDeleteMock.mockReturnValue({
      lean: () =>
        Promise.resolve({
          _id: bloqueioId,
          funcionario_id: funcionarioId,
          inicio_em: new Date("2026-06-01T10:00:00.000Z"),
          fim_em: new Date("2026-06-01T12:00:00.000Z"),
          motivo: "Reunião",
          criado_por: criadoPorId,
        }),
    });
  });

  it("criarBloqueio bloqueia apenas horários disponíveis ou pré-reservados", async () => {
    const { criarBloqueio } = await import("../../../src/api/service/bloqueio.service.js");

    const inicio = new Date("2026-06-01T10:00:00.000Z");
    const fim = new Date("2026-06-01T12:00:00.000Z");

    const resultado = await criarBloqueio({
      funcionario_id: funcionarioId,
      inicio_em: inicio,
      fim_em: fim,
      motivo: "Reunião interna",
      criado_por: criadoPorId,
    });

    expect(resultado.bloqueio_id).toBe(bloqueioId.toString());
    expect(resultado.horarios_afetados).toBe(2);
    expect(horarioUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        funcionario_id: funcionarioId,
        status: { $in: ["disponivel", "pre_reservado"] },
      }),
      { $set: { status: "bloqueado" } },
    );
  });

  it("criarBloqueio não altera horários com status agendado", async () => {
    const { criarBloqueio } = await import("../../../src/api/service/bloqueio.service.js");

    await criarBloqueio({
      funcionario_id: funcionarioId,
      inicio_em: new Date("2026-06-01T10:00:00.000Z"),
      fim_em: new Date("2026-06-01T12:00:00.000Z"),
      motivo: "Manutenção",
      criado_por: criadoPorId,
    });

    const filtro = horarioUpdateManyMock.mock.calls[0][0] as { status: { $in: string[] } };
    expect(filtro.status.$in).not.toContain("agendado");
  });

  it("removerBloqueio libera horários bloqueados sem agendamento ativo", async () => {
    horarioUpdateManyMock.mockResolvedValue({ modifiedCount: 3 });

    const { removerBloqueio } = await import("../../../src/api/service/bloqueio.service.js");
    const resultado = await removerBloqueio(bloqueioId);

    expect(resultado.bloqueio_id).toBe(bloqueioId.toString());
    expect(resultado.horarios_liberados).toBe(3);
    expect(horarioUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "bloqueado",
        $or: [{ agendamento_id: null }, { agendamento_id: { $exists: false } }],
      }),
      { $set: { status: "disponivel" } },
    );
  });
});
