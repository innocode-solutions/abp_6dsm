import { describe, it, expect } from "vitest";
import flow from "../../src/flows/emprestimo-nao-reconhecido.json";

describe("Fluxo empréstimo não reconhecido", () => {
  it("deve orientar cancelamento, devolução e envio do contrato quando não autorizou e não usou o valor em caso de empréstimo", () => {
    const answers = {
      autorizou: "nao",
      usou_valor: "nao",
      tipo_desconto: "emprestimo"
    };

    const rule = flow.rules.find(
      (r) =>
        r.conditions.autorizou === answers.autorizou &&
        r.conditions.usou_valor === answers.usou_valor &&
        r.conditions.tipo_desconto === answers.tipo_desconto
    );

    expect(rule).toBeDefined();

    const response = flow.responses[rule!.response as keyof typeof flow.responses];

    expect(response.summary).toContain("empréstimo não contratado");

    expect("recommendations" in response).toBe(true);
    if ("recommendations" in response) {
      expect(response.recommendations).toContain("Solicitar cancelamento imediato");
      expect(response.recommendations).toContain(
        "Solicitar devolução em dobro dos valores cobrados indevidamente"
      );
      expect(response.recommendations).toContain("Solicitar envio do contrato");
    }
  });

  it("deve orientar interrupção dos descontos quando for RMC/RCC não reconhecido", () => {
    const answers = {
      autorizou: "nao",
      usou_valor: "nao",
      tipo_desconto: "rmc_rcc"
    };

    const rule = flow.rules.find(
      (r) =>
        r.conditions.autorizou === answers.autorizou &&
        r.conditions.usou_valor === answers.usou_valor &&
        r.conditions.tipo_desconto === answers.tipo_desconto
    );

    expect(rule).toBeDefined();

    const response = flow.responses[rule!.response as keyof typeof flow.responses];

    expect(response.summary).toContain("RMC/RCC");
  });
});