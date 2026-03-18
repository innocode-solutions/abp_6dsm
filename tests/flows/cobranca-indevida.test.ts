import { describe, it, expect } from "vitest";
import flow from "../../src/flows/cobranca-indevida.json";

describe("Fluxo cobrança indevida", () => {
  it("deve orientar contestação quando o consumidor não reconhece a cobrança", () => {
    const answers = {
      reconhece_cobranca: "nao"
    };

    const rule = flow.rules.find(
      (r) => r.conditions.reconhece_cobranca === answers.reconhece_cobranca
    );

    expect(rule).toBeDefined();

    const response = flow.responses[rule!.response as keyof typeof flow.responses];

    expect(response.summary).toContain("cobrança indevida");

    expect("recommendations" in response).toBe(true);
    if ("recommendations" in response) {
      expect(response.recommendations).toContain(
        "Solicitar cancelamento da cobrança"
      );
    }
  });

  it("deve informar que o fluxo não se aplica quando a cobrança é reconhecida", () => {
    const answers = {
      reconhece_cobranca: "sim"
    };

    const rule = flow.rules.find(
      (r) => r.conditions.reconhece_cobranca === answers.reconhece_cobranca
    );

    expect(rule).toBeDefined();

    const response = flow.responses[rule!.response as keyof typeof flow.responses];

    expect(response.summary).toContain("reconhecida");
  });
});