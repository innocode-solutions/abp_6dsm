import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const findMock = vi.fn();

vi.mock("../../../src/api/models/Horario.model.js", () => ({
  default: {
    find: (...args: unknown[]) => findMock(...args),
  },
}));

describe("horario.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna horários disponíveis com campo exibicao", async () => {
    const servicoId = new mongoose.Types.ObjectId();
    const inicio = new Date("2026-05-25T14:00:00.000Z");

    findMock.mockReturnValue({
      sort: () => ({
        limit: () => ({
          lean: () =>
            Promise.resolve([
              {
                _id: new mongoose.Types.ObjectId(),
                funcionario_id: new mongoose.Types.ObjectId(),
                servico_id: servicoId,
                inicio_em: inicio,
                fim_em: new Date("2026-05-25T14:30:00.000Z"),
                status: "disponivel",
              },
            ]),
        }),
      }),
    });

    const { getHorariosDisponiveis } = await import(
      "../../../src/api/service/horario.service.js"
    );
    const resultado = await getHorariosDisponiveis(servicoId);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].exibicao.data).toBe("25/05/2026");
    expect(resultado[0].exibicao.hora).toMatch(/^\d{2}:\d{2}$/);
    expect(resultado[0].exibicao.dia_semana).toBe("segunda-feira");
  });
});
