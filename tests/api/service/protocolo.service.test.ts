import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findOneMock = vi.fn();
const existsMock = vi.fn();

vi.mock("../../../src/api/models/Agendamento.model.js", () => ({
  default: {
    findOne: (...args: unknown[]) => findOneMock(...args),
    exists: (...args: unknown[]) => existsMock(...args),
  },
}));

describe("protocolo.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-16T12:00:00.000Z"));
    existsMock.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("gera AGD-AAAA-000001 quando não há protocolo anterior no ano", async () => {
    findOneMock.mockReturnValue({
      sort: () => ({
        select: () => ({
          lean: () => Promise.resolve(null),
        }),
      }),
    });

    const { generateProtocolo } = await import("../../../src/api/service/protocolo.service.js");
    await expect(generateProtocolo()).resolves.toBe("AGD-2026-000001");
  });

  it("incrementa sequencial com base no último código do ano", async () => {
    findOneMock.mockReturnValue({
      sort: () => ({
        select: () => ({
          lean: () =>
            Promise.resolve({ codigo_agendamento: "AGD-2026-000042" }),
        }),
      }),
    });

    const { generateProtocolo } = await import("../../../src/api/service/protocolo.service.js");
    await expect(generateProtocolo()).resolves.toBe("AGD-2026-000043");
  });
});
