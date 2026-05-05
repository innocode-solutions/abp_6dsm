import { describe, it, expect } from "vitest";
import {
  classificationAcceptsFlow,
  NLP_NONE_INTENT,
  NLP_MIN_FLOW_SCORE
} from "../../src/extraction/nlp-flow-classifier";
import type { FlowDefinition } from "../../src/types/flow";
import type { FlowNlpClassification } from "../../src/extraction/types";

const sampleFlow: FlowDefinition = {
  id: "cobranca_indevida",
  title: "Cobrança",
  triggers: [],
  steps: [],
  rules: [],
  responses: {}
};

const flowsById = new Map<string, FlowDefinition>([["cobranca_indevida", sampleFlow]]);

function classify(intent: string, score: number): FlowNlpClassification {
  return { intent, score };
}

describe("classificationAcceptsFlow (threshold NLP ↔ continuação para RAG)", () => {
  it("considera NLP_MIN_FLOW_SCORE = 0,65 como limite configurado no código", () => {
    expect(NLP_MIN_FLOW_SCORE).toBe(0.65);
  });

  it("rejeita fluxo quando score < 0,65 (matcher devolve null → processador pode ir ao RAG)", () => {
    const flow = classificationAcceptsFlow(
      classify("cobranca_indevida", 0.64),
      flowsById,
      NLP_NONE_INTENT,
      NLP_MIN_FLOW_SCORE
    );
    expect(flow).toBeNull();
  });

  it("aceita fluxo quando score >= 0,65 e intent é um fluxo conhecido", () => {
    const flow = classificationAcceptsFlow(
      classify("cobranca_indevida", 0.65),
      flowsById,
      NLP_NONE_INTENT,
      NLP_MIN_FLOW_SCORE
    );
    expect(flow).not.toBeNull();
    expect(flow?.id).toBe("cobranca_indevida");
  });

  it("ignora mesmo com score alto se intent é abp.none", () => {
    expect(
      classificationAcceptsFlow(
        classify(NLP_NONE_INTENT, 0.99),
        flowsById,
        NLP_NONE_INTENT,
        NLP_MIN_FLOW_SCORE
      )
    ).toBeNull();
  });

  it("ignora mesmo com score alto se intent é None da biblioteca", () => {
    expect(
      classificationAcceptsFlow(
        classify("None", 0.99),
        flowsById,
        NLP_NONE_INTENT,
        NLP_MIN_FLOW_SCORE
      )
    ).toBeNull();
  });
});
