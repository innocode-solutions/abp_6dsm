import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
const findOneAndUpdateMock = vi.fn();

vi.mock("../../../src/api/models/Horario.model.js", () => ({
  default: {
    findOneAndUpdate: (...args: unknown[]) => findOneAndUpdateMock(...args),
  },
}));

describe("preReserva.service", () => {
  const horarioId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cria pré-reserva quando horário está disponível", async () => {
    findOneAndUpdateMock.mockResolvedValue({
      _id: horarioId,
      status: "pre_reservado",
    });

    const { criarPreReserva } = await import("../../../src/api/service/preReserva.service.js");
    const resultado = await criarPreReserva({
      horario_id: horarioId,
      conversa_id: "conv-1",
      origem: "whatsapp",
      minutos_pre_reserva: 15,
    });

    expect(resultado.pre_reserva_id).toBeDefined();
    expect(findOneAndUpdateMock).toHaveBeenCalledWith(
      { _id: horarioId, status: "disponivel" },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "pre_reservado",
          pre_reserva: expect.objectContaining({
            conversa_id: "conv-1",
          }),
        }),
      }),
      { new: true },
    );
  });

  it("lança HORARIO_INDISPONIVEL quando update retorna null", async () => {
    findOneAndUpdateMock.mockResolvedValue(null);

    const { criarPreReserva } = await import("../../../src/api/service/preReserva.service.js");

    await expect(
      criarPreReserva({
        horario_id: horarioId,
        conversa_id: "conv-1",
        origem: "whatsapp",
        minutos_pre_reserva: 15,
      }),
    ).rejects.toMatchObject({
      codigo: "HORARIO_INDISPONIVEL",
      httpStatus: 409,
    });
  });

  it("apenas uma chamada simultânea com sucesso simula segunda falhando", async () => {
    findOneAndUpdateMock
      .mockResolvedValueOnce({ _id: horarioId, status: "pre_reservado" })
      .mockResolvedValueOnce(null);

    const { criarPreReserva } = await import("../../../src/api/service/preReserva.service.js");

    await expect(
      criarPreReserva({
        horario_id: horarioId,
        conversa_id: "conv-a",
        origem: "whatsapp",
        minutos_pre_reserva: 10,
      }),
    ).resolves.toBeDefined();

    await expect(
      criarPreReserva({
        horario_id: horarioId,
        conversa_id: "conv-b",
        origem: "whatsapp",
        minutos_pre_reserva: 10,
      }),
    ).rejects.toMatchObject({ codigo: "HORARIO_INDISPONIVEL" });
  });
});
