import { describe, it, expect } from "vitest";
import flow from "../../src/flows/cancelamento-plano.json";

describe("Fluxo cancelamento de plano", () => {
  it("deve orientar cancelamento imediato quando já tentou cancelar e não há fidelidade", () => {
    const answers = {
      tentou_cancelar: "sim",
      tem_fidelidade: "nao"
    };

    const rule = flow.rules.find(
      (r) =>
        r.conditions.tentou_cancelar === answers.tentou_cancelar &&
        r.conditions.tem_fidelidade === answers.tem_fidelidade
    );

    expect(rule).toBeDefined();

    const response = flow.responses[rule!.response as keyof typeof flow.responses];

    expect(response.summary).toContain("cancelamento imediato");
    expect("recommendations" in response).toBe(true);

    if ("recommendations" in response) {
      expect(response.recommendations).toContain(
        "Solicitar cancelamento imediato do serviço"
      );
      expect(response.recommendations).toContain(
        "Solicitar suspensão das cobranças"
      );
    }
  });

  it("deve orientar análise de fidelidade quando houver multa contratual", () => {
    const answers = {
      tentou_cancelar: "sim",
      tem_fidelidade: "sim"
    };

    const rule = flow.rules.find(
      (r) =>
        r.conditions.tentou_cancelar === answers.tentou_cancelar &&
        r.conditions.tem_fidelidade === answers.tem_fidelidade
    );

    expect(rule).toBeDefined();

    const response = flow.responses[rule!.response as keyof typeof flow.responses];

    expect(response.summary).toContain("fidelidade");
  });
});