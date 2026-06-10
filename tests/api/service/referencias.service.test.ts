import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const funcionarioFindByIdMock = vi.fn();
const servicoFindByIdMock = vi.fn();

vi.mock("../../../src/api/models/Funcionario.model.js", () => ({
  default: {
    findById: (...args: unknown[]) => funcionarioFindByIdMock(...args),
    find: vi.fn(),
    exists: vi.fn(),
  },
}));

vi.mock("../../../src/api/models/Servico.model.js", () => ({
  default: {
    findById: (...args: unknown[]) => servicoFindByIdMock(...args),
    find: vi.fn(),
    exists: vi.fn(),
  },
}));

function leanResult<T>(value: T) {
  return {
    select: () => ({
      lean: () => Promise.resolve(value),
    }),
  };
}

describe("referencias.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("assertFuncionarioExisteEAtivo com id inválido retorna ERRO_VALIDACAO", async () => {
    const { assertFuncionarioExisteEAtivo } = await import(
      "../../../src/api/service/validacao/referencias.service.js"
    );

    await expect(assertFuncionarioExisteEAtivo("id-invalido")).rejects.toMatchObject({
      codigo: "ERRO_VALIDACAO",
      httpStatus: 400,
    });
  });

  it("assertFuncionarioExisteEAtivo inexistente retorna FUNCIONARIO_NAO_ENCONTRADO", async () => {
    funcionarioFindByIdMock.mockReturnValue(leanResult(null));

    const { assertFuncionarioExisteEAtivo } = await import(
      "../../../src/api/service/validacao/referencias.service.js"
    );
    const id = new mongoose.Types.ObjectId().toString();

    await expect(assertFuncionarioExisteEAtivo(id)).rejects.toMatchObject({
      codigo: "FUNCIONARIO_NAO_ENCONTRADO",
      httpStatus: 404,
    });
  });

  it("assertFuncionarioExisteEAtivo inativo retorna FUNCIONARIO_INATIVO", async () => {
    funcionarioFindByIdMock.mockReturnValue(leanResult({ ativo: false }));

    const { assertFuncionarioExisteEAtivo } = await import(
      "../../../src/api/service/validacao/referencias.service.js"
    );
    const id = new mongoose.Types.ObjectId().toString();

    await expect(assertFuncionarioExisteEAtivo(id)).rejects.toMatchObject({
      codigo: "FUNCIONARIO_INATIVO",
      httpStatus: 409,
    });
  });

  it("assertServicoExisteEAtivo inativo retorna SERVICO_INATIVO", async () => {
    servicoFindByIdMock.mockReturnValue(leanResult({ ativo: false }));

    const { assertServicoExisteEAtivo } = await import(
      "../../../src/api/service/validacao/referencias.service.js"
    );
    const id = new mongoose.Types.ObjectId().toString();

    await expect(assertServicoExisteEAtivo(id)).rejects.toMatchObject({
      codigo: "SERVICO_INATIVO",
      httpStatus: 409,
    });
  });
});
