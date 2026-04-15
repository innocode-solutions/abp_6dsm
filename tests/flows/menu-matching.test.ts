import { describe, it, expect } from "vitest";
import { FlowMatcher } from "../../src/flows/flow-matcher";
import { flowRegistry, getFlowsAsMenu } from "../../src/flows/flow-registry";
import type { FlowDefinition, MatcherInvalidMenuNumber, MatcherReturnToMenu } from "../../src/types/flow";

// Helper type guards
function isFlowDefinition(result: any): result is FlowDefinition {
  return result && typeof result === "object" && "id" in result;
}

function isInvalidMenuNumber(result: any): result is MatcherInvalidMenuNumber {
  return result && typeof result === "object" && result.type === "invalid_menu_number";
}

function isReturnToMenu(result: any): result is MatcherReturnToMenu {
  return result && typeof result === "object" && result.type === "return_to_menu";
}

describe("Menu and Numeric Selection", () => {
  const matcher = new FlowMatcher();

  describe("getFlowsAsMenu", () => {
    it("deve gerar menu com todos os fluxos", () => {
      const { menu, flowMap } = getFlowsAsMenu(flowRegistry);

      expect(menu).toContain("Olá! Sou o ProconBot Jacareí");
      expect(menu).toContain("1.");
      expect(menu).toContain("2.");
      expect(menu).toContain("3.");
      expect(menu).toContain("4.");
      expect(menu).toContain("5.");
    });

    it("deve retornar mapa com todos os fluxos numerados", () => {
      const { flowMap } = getFlowsAsMenu(flowRegistry);

      expect(flowMap["1"]).toBeDefined();
      expect(flowMap["2"]).toBeDefined();
      expect(flowMap["3"]).toBeDefined();
      expect(flowMap["4"]).toBeDefined();
      expect(flowMap["5"]).toBeDefined();

      expect(flowMap["6"]).toBeUndefined();
    });
  });

  describe("FlowMatcher - Numeric Selection", () => {
    it("deve retornar primeiro fluxo quando usuário digita 1", () => {
      const result = matcher.findByMessage("1", flowRegistry);

      expect(result).toBeDefined();
      expect(isFlowDefinition(result)).toBe(true);
      if (isFlowDefinition(result)) {
        expect(result.id).toBe(flowRegistry[0].id);
      }
    });

    it("deve retornar segundo fluxo quando usuário digita 2", () => {
      const result = matcher.findByMessage("2", flowRegistry);

      expect(result).toBeDefined();
      expect(isFlowDefinition(result)).toBe(true);
      if (isFlowDefinition(result)) {
        expect(result.id).toBe(flowRegistry[1].id);
      }
    });

    it("deve retornar último fluxo quando usuário digita 5", () => {
      const result = matcher.findByMessage("5", flowRegistry);

      expect(result).toBeDefined();
      expect(isFlowDefinition(result)).toBe(true);
      if (isFlowDefinition(result)) {
        expect(result.id).toBe(flowRegistry[4].id);
      }
    });

    it("deve ignorar espaços em branco ao redor do número", () => {
      const result1 = matcher.findByMessage("  1  ", flowRegistry);
      const result2 = matcher.findByMessage(" 3 ", flowRegistry);

      expect(isFlowDefinition(result1)).toBe(true);
      expect(isFlowDefinition(result2)).toBe(true);
    });
  });

  describe("FlowMatcher - Invalid Menu Number", () => {
    it("deve retornar invalid_menu_number para número fora do range", () => {
      const result = matcher.findByMessage("10", flowRegistry);

      expect(result).toBeDefined();
      expect(isInvalidMenuNumber(result)).toBe(true);
      if (isInvalidMenuNumber(result)) {
        expect(result.attemptedNumber).toBe(10);
        expect(result.maxOptions).toBe(flowRegistry.length);
      }
    });

    it("deve retornar invalid_menu_number para 0", () => {
      const result = matcher.findByMessage("0", flowRegistry);

      // 0 é um trigger especial para "voltar", então deve retornar return_to_menu
      expect(result).toBeDefined();
      expect(isReturnToMenu(result)).toBe(true);
    });

    it("deve retornar invalid_menu_number para número negativo", () => {
      const result = matcher.findByMessage("-1", flowRegistry);

      expect(result).toBeNull();
    });
  });

  describe("FlowMatcher - Return to Menu", () => {
    it("deve retornar return_to_menu quando usuário digita 'menu'", () => {
      const result = matcher.findByMessage("menu", flowRegistry);

      expect(result).toBeDefined();
      expect(isReturnToMenu(result)).toBe(true);
    });

    it("deve retornar return_to_menu quando usuário digita '0'", () => {
      const result = matcher.findByMessage("0", flowRegistry);

      expect(result).toBeDefined();
      expect(isReturnToMenu(result)).toBe(true);
    });

    it("deve ser case-insensitive para 'menu'", () => {
      const result1 = matcher.findByMessage("MENU", flowRegistry);
      const result2 = matcher.findByMessage("Menu", flowRegistry);
      const result3 = matcher.findByMessage("MeNu", flowRegistry);

      [result1, result2, result3].forEach((result) => {
        expect(isReturnToMenu(result)).toBe(true);
      });
    });
  });

  describe("FlowMatcher - Text Triggers (Existing Behavior)", () => {
    it("deve continuar funcionando com triggers de texto", () => {
      const result = matcher.findByMessage("cancelar serviço", flowRegistry);

      expect(result).toBeDefined();
      expect(isFlowDefinition(result)).toBe(true);
      if (isFlowDefinition(result)) {
        expect(result.id).toBe("cancelamento_plano");
      }
    });

    it("deve persistir prioridade de matching por ordem de registro", () => {
      // cobranca-indevida é primeiro na registry
      const result = matcher.findByMessage("cobrança indevida", flowRegistry);

      expect(result).toBeDefined();
      expect(isFlowDefinition(result)).toBe(true);
    });
  });

  describe("FlowMatcher - Fallback", () => {
    it("deve retornar null quando nenhum match é encontrado", () => {
      const result = matcher.findByMessage("xyz123nonsense", flowRegistry);

      expect(result).toBeNull();
    });

    it("deve retornar null para texto genérico que não dá match", () => {
      const result = matcher.findByMessage("olá", flowRegistry);

      expect(result).toBeNull();
    });
  });
});
