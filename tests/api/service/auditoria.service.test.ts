import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();

vi.mock("../../../src/api/models/LogAuditoria.model.js", () => ({
  default: {
    create: (...args: unknown[]) => createMock(...args),
  },
}));

describe("auditoria.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persiste log de auditoria", async () => {
    createMock.mockResolvedValue({});
    const { registrarAuditoria } = await import("../../../src/api/service/auditoria.service.js");

    await registrarAuditoria({
      entidade: "Agendamento",
      entidade_id: "AGD-2026-000001",
      acao: "CONFIRMAR",
      executado_por: { tipo: "sistema", id: "conv-1" },
    });

    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("não propaga erro quando create falha", async () => {
    createMock.mockRejectedValue(new Error("falha mongo"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { registrarAuditoria } = await import("../../../src/api/service/auditoria.service.js");

    await expect(
      registrarAuditoria({
        entidade: "Agendamento",
        entidade_id: "AGD-2026-000001",
        acao: "CONFIRMAR",
        executado_por: { tipo: "sistema", id: "conv-1" },
      }),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
