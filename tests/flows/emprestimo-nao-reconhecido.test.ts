import { describe, it, expect } from "vitest";
import flow from "../../src/flows/emprestimo-nao-reconhecido.json";

/**
 * Testa o fluxo "empréstimo não reconhecido".
 * Verifica se as regras do fluxo direcionam para a resposta correta
 * com base nas respostas do usuário.
 */

describe("Fluxo empréstimo não reconhecido", () => {
  it("deve orientar cancelamento quando não autorizou e não usou", () => {
    const answers = {
      autorizou: "nao",
      usou_valor: "nao"
    };

    const rule = flow.rules.find(
      (r) =>
        r.conditions.autorizou === answers.autorizou &&
        r.conditions.usou_valor === answers.usou_valor
    );

    expect(rule).toBeDefined();

    const response = flow.responses[rule!.response as keyof typeof flow.responses];

    expect(response.summary).toContain("empréstimo não reconhecido");

    expect("recommendations" in response).toBe(true);
    if ("recommendations" in response) {
      expect(response.recommendations).toContain(
        "Solicitar cancelamento imediato do empréstimo"
      );
    }
  });
});