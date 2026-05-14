import { describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/api/types/common.types";
import { maskCpf, hashCpf } from "../../src/api/utils/cpfHelper";
import { toBrasiliaDisplay } from "../../src/api/utils/dateHelper";
import { success } from "../../src/api/utils/responseHelper";

describe("src/api types e utils", () => {
  it("maskCpf mascara CPF de 11 digitos", () => {
    expect(maskCpf("12345678900")).toBe("***.456.789-**");
  });

  it("toBrasiliaDisplay converte UTC para America/Sao_Paulo", () => {
    const out = toBrasiliaDisplay(new Date("2026-05-20T12:00:00.000Z"));
    expect(out).toEqual({
      data: "20/05/2026",
      hora: "09:00",
      dia_semana: "quarta-feira",
    });
  });

  it("AppError e instancia de Error", () => {
    const err = new AppError("HORARIO_INDISPONIVEL", 409);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.codigo).toBe("HORARIO_INDISPONIVEL");
    expect(err.httpStatus).toBe(409);
    expect(err.mensagem).toBe("HORARIO_INDISPONIVEL");
  });

  it("success gera requisicao_id quando omitido", () => {
    const res = success({ ok: true });
    expect(res.dados).toEqual({ ok: true });
    expect(res.meta.requisicao_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(res.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("hashCpf usa CPF_HASH_SALT do ambiente", () => {
    vi.stubEnv("CPF_HASH_SALT", "salt-teste");
    try {
      const h = hashCpf("12345678900");
      expect(h).toMatch(/^[a-f0-9]{64}$/);
      expect(hashCpf("12345678900")).toBe(h);
      expect(hashCpf("11144477735")).not.toBe(h);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
