import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const horarioFindOneAndUpdateMock = vi.fn();
const horarioUpdateOneMock = vi.fn();
const assertHorarioReferenciasAtivasMock = vi.fn();

vi.mock("../../../src/api/models/Horario.model.js", () => ({
  default: {
    findOneAndUpdate: (...args: unknown[]) => horarioFindOneAndUpdateMock(...args),
    updateOne: (...args: unknown[]) => horarioUpdateOneMock(...args),
  },
}));

vi.mock("../../../src/api/service/validacao/referencias.service.js", () => ({
  assertHorarioReferenciasAtivas: (...args: unknown[]) =>
    assertHorarioReferenciasAtivasMock(...args),
}));

describe("preReserva.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    horarioUpdateOneMock.mockResolvedValue({});
    assertHorarioReferenciasAtivasMock.mockResolvedValue(undefined);
  });

  it("criarPreReserva com funcionário inativo reverte slot e propaga erro", async () => {
    const horarioId = new mongoose.Types.ObjectId();
    const inicio = new Date(Date.now() + 24 * 60 * 60 * 1000);
    horarioFindOneAndUpdateMock.mockResolvedValue({
      _id: horarioId,
      funcionario_id: new mongoose.Types.ObjectId(),
      servico_id: new mongoose.Types.ObjectId(),
      inicio_em: inicio,
    });
    assertHorarioReferenciasAtivasMock.mockRejectedValue({
      codigo: "FUNCIONARIO_INATIVO",
      httpStatus: 409,
    });

    const { criarPreReserva } = await import(
      "../../../src/api/service/preReserva.service.js"
    );

    await expect(
      criarPreReserva({
        horario_id: horarioId,
        conversa_id: "conv-1",
        origem: "whatsapp",
        minutos_pre_reserva: 15,
      }),
    ).rejects.toMatchObject({ codigo: "FUNCIONARIO_INATIVO", httpStatus: 409 });

    expect(horarioUpdateOneMock).toHaveBeenCalledWith(
      { _id: horarioId },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "disponivel" }),
      }),
    );
  });
});
