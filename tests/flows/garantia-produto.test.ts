import { describe, it, expect } from "vitest";
import flow from "../../src/flows/garantia-produto.json";

describe("Fluxo garantia de produto", () => {
  it("deve orientar sobre os direitos quando produto durável apresentou defeito e não foi resolvido em 30 dias", () => {
    const answers = {
      produto_com_defeito: "sim",
      tipo_produto: "duravel",
      defeito_resolvido_30_dias: "nao"
    };

    const rule = flow.rules.find(
      (r) =>
        r.conditions.produto_com_defeito === answers.produto_com_defeito &&
        r.conditions.tipo_produto === answers.tipo_produto &&
        r.conditions.defeito_resolvido_30_dias === answers.defeito_resolvido_30_dias
    );

    expect(rule).toBeDefined();

    const response = flow.responses[rule!.response as keyof typeof flow.responses];

    expect(response.summary).toContain("Produto durável");
    expect(response.message).toContain("90 dias");

    expect("recommendations" in response).toBe(true);
    if ("recommendations" in response) {
      expect(response.recommendations).toContain(
        "Solicitar substituição do produto por outro novo"
      );
      expect(response.recommendations).toContain(
        "Solicitar devolução do valor pago"
      );
    }
  });

  it("deve orientar a acionar a garantia quando ainda não procurou assistência", () => {
    const answers = {
      produto_com_defeito: "sim",
      defeito_resolvido_30_dias: "nao_procurei"
    };

    const rule = flow.rules.find(
      (r) =>
        r.conditions.produto_com_defeito === answers.produto_com_defeito &&
        r.conditions.defeito_resolvido_30_dias === answers.defeito_resolvido_30_dias
    );

    expect(rule).toBeDefined();

    const response = flow.responses[rule!.response as keyof typeof flow.responses];

    expect(response.summary).toContain("acionar");
    expect(response.message).toContain("garantia legal");
  });
});