import { beforeAll, describe, it, expect } from "vitest";
import { FlowMatcher, type FlowExtractionOrchestrator } from "../../src/flows/flow-matcher";
import { flowRegistry, getFlowsAsMenu } from "../../src/flows/flow-registry";
import type { FlowDefinition, MatcherInvalidMenuNumber, MatcherReturnToMenu } from "../../src/types/flow";

// Helper type guards
function isFlowDefinition(result: unknown): result is FlowDefinition {
  return Boolean(result && typeof result === "object" && result !== null && "id" in result);
}

function isInvalidMenuNumber(result: unknown): result is MatcherInvalidMenuNumber {
  return (
    Boolean(result) &&
    typeof result === "object" &&
    result !== null &&
    "type" in result &&
    (result as MatcherInvalidMenuNumber).type === "invalid_menu_number"
  );
}

function isReturnToMenu(result: unknown): result is MatcherReturnToMenu {
  return (
    Boolean(result) &&
    typeof result === "object" &&
    result !== null &&
    "type" in result &&
    (result as MatcherReturnToMenu).type === "return_to_menu"
  );
}

describe("Menu and Numeric Selection", () => {
  let matcher: FlowExtractionOrchestrator;

  beforeAll(async () => {
    matcher = new FlowMatcher(flowRegistry);
    await matcher.initialize();
  });

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
    it("deve retornar primeiro fluxo quando usuário digita 1", async () => {
      const outcome = await matcher.findByMessage("1", flowRegistry);

      expect(outcome.match).toBeDefined();
      expect(isFlowDefinition(outcome.match)).toBe(true);
      if (isFlowDefinition(outcome.match)) {
        expect(outcome.match.id).toBe(flowRegistry[0].id);
      }
    });

    it("deve retornar segundo fluxo quando usuário digita 2", async () => {
      const outcome = await matcher.findByMessage("2", flowRegistry);

      expect(outcome.match).toBeDefined();
      expect(isFlowDefinition(outcome.match)).toBe(true);
      if (isFlowDefinition(outcome.match)) {
        expect(outcome.match.id).toBe(flowRegistry[1].id);
      }
    });

    it("deve retornar último fluxo quando usuário digita 5", async () => {
      const outcome = await matcher.findByMessage("5", flowRegistry);

      expect(outcome.match).toBeDefined();
      expect(isFlowDefinition(outcome.match)).toBe(true);
      if (isFlowDefinition(outcome.match)) {
        expect(outcome.match.id).toBe(flowRegistry[4].id);
      }
    });

    it("deve ignorar espaços em branco ao redor do número", async () => {
      const outcome1 = await matcher.findByMessage("  1  ", flowRegistry);
      const outcome2 = await matcher.findByMessage(" 3 ", flowRegistry);

      expect(isFlowDefinition(outcome1.match)).toBe(true);
      expect(isFlowDefinition(outcome2.match)).toBe(true);
    });
  });

  describe("FlowMatcher - Invalid Menu Number", () => {
    it("deve retornar invalid_menu_number para número fora do range", async () => {
      const outcome = await matcher.findByMessage("10", flowRegistry);

      expect(outcome.match).toBeDefined();
      expect(isInvalidMenuNumber(outcome.match)).toBe(true);
      if (isInvalidMenuNumber(outcome.match)) {
        expect(outcome.match.attemptedNumber).toBe(10);
        expect(outcome.match.maxOptions).toBe(flowRegistry.length);
      }
    });

    it("deve retornar invalid_menu_number para 0", async () => {
      const outcome = await matcher.findByMessage("0", flowRegistry);

      // 0 é um trigger especial para "voltar", então deve retornar return_to_menu
      expect(outcome.match).toBeDefined();
      expect(isReturnToMenu(outcome.match)).toBe(true);
    });

    it("deve retornar invalid_menu_number para número negativo", async () => {
      const outcome = await matcher.findByMessage("-1", flowRegistry);

      expect(outcome.match).toBeNull();
    });
  });

  describe("FlowMatcher - Return to Menu", () => {
    it("deve retornar return_to_menu quando usuário digita 'menu'", async () => {
      const outcome = await matcher.findByMessage("menu", flowRegistry);

      expect(outcome.match).toBeDefined();
      expect(isReturnToMenu(outcome.match)).toBe(true);
    });

    it("deve retornar return_to_menu quando usuário digita '0'", async () => {
      const outcome = await matcher.findByMessage("0", flowRegistry);

      expect(outcome.match).toBeDefined();
      expect(isReturnToMenu(outcome.match)).toBe(true);
    });

    it("deve ser case-insensitive para 'menu'", async () => {
      const result1 = await matcher.findByMessage("MENU", flowRegistry);
      const result2 = await matcher.findByMessage("Menu", flowRegistry);
      const result3 = await matcher.findByMessage("MeNu", flowRegistry);

      [result1, result2, result3].forEach((outcome) => {
        expect(isReturnToMenu(outcome.match)).toBe(true);
      });
    });
  });

  describe("FlowMatcher - Text Triggers (Existing Behavior)", () => {
    it("deve continuar funcionando com triggers de texto", async () => {
      const outcome = await matcher.findByMessage("cancelar serviço", flowRegistry);

      expect(outcome.match).toBeDefined();
      expect(isFlowDefinition(outcome.match)).toBe(true);
      if (isFlowDefinition(outcome.match)) {
        expect(outcome.match.id).toBe("cancelamento_plano");
      }
    });

    it("deve persistir prioridade de matching por ordem de registro", async () => {
      // cobranca-indevida é primeiro na registry
      const outcome = await matcher.findByMessage("cobrança indevida", flowRegistry);

      expect(outcome.match).toBeDefined();
      expect(isFlowDefinition(outcome.match)).toBe(true);
    });
  });

  describe("FlowMatcher - Fallback", () => {
    it("deve retornar null quando nenhum match é encontrado", async () => {
      const outcome = await matcher.findByMessage("xyz123nonsense", flowRegistry);

      expect(outcome.match).toBeNull();
    });

    it("deve retornar null para texto genérico que não dá match", async () => {
      const outcome = await matcher.findByMessage("olá", flowRegistry);

      expect(outcome.match).toBeNull();
    });
  });
});
