import { describe, expect, it } from "vitest";
import { getFlowLabel } from "../../src/api/utils/flowLabelHelper";

describe("getFlowLabel", () => {
  it("retorna label amigavel para fluxos conhecidos", () => {
    expect(getFlowLabel("cobranca_indevida")).toBe("Cobrança indevida");
    expect(getFlowLabel("garantia_produto")).toBe("Garantia de produto");
    expect(getFlowLabel("cancelamento_plano")).toBe("Cancelamento de plano");
    expect(getFlowLabel("direito_arrependimento")).toBe("Direito de arrependimento");
    expect(getFlowLabel("emprestimo_nao_reconhecido")).toBe("Empréstimo não reconhecido");
    expect(getFlowLabel("agendamento")).toBe("Agendamento");
  });

  it("formata flowId desconhecido como fallback legivel", () => {
    expect(getFlowLabel("novo_fluxo-teste")).toBe("Novo fluxo teste");
  });

  it("usa Outros para flowId vazio", () => {
    expect(getFlowLabel("   ")).toBe("Outros");
  });
});
