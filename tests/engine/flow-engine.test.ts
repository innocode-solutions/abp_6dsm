import { describe, expect, it } from "vitest";
import { FlowEngine } from "../../src/engine/flow-engine";
import rawFlow from "../../src/flows/direito-arrependimento.json";
import { asFlow } from "../../src/utils/as-flow";

const flow = asFlow(rawFlow);

describe("FlowEngine", () => {
  it("deve iniciar no primeiro passo", () => {
    const engine = new FlowEngine();
    const session = engine.start(flow);

    const currentStep = engine.getCurrentStep(flow, session);

    expect(currentStep).toBeDefined();
    expect(currentStep?.id).toBe("tipo_compra");
  });

  it("deve avançar para o próximo passo quando ainda não houver regra satisfeita", () => {
    const engine = new FlowEngine();
    const session = engine.start(flow);

    const result = engine.answerCurrentStep(flow, session, "online");

    expect(result.type).toBe("step");

    if (result.type === "step") {
      expect(result.step.id).toBe("dias_compra");
    }
  });

  it("deve finalizar o fluxo quando uma regra for satisfeita", () => {
    const engine = new FlowEngine();
    const session = engine.start(flow);

    engine.answerCurrentStep(flow, session, "online");
    const result = engine.answerCurrentStep(flow, session, "ate7");

    expect(result.type).toBe("completed");

    if (result.type === "completed") {
      expect(result.responseKey).toBe("direito_aplicavel");
      expect(result.response.summary).toContain("direito de arrependimento");
    }
  });
});