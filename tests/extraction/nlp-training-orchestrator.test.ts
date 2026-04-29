import { beforeAll, describe, it, expect, vi, afterAll } from "vitest";
import { NlpManager } from "node-nlp";
import { FlowExtractionOrchestrator } from "../../src/extraction/flow-extraction-orchestrator";
import { flowRegistry } from "../../src/flows/flow-registry";

/**
 * - `train()` garante que os documentos/intents foram passados ao learner.
 * - Quando só o NLU decide, `nlpClassification` reflete o retorno de `process()`.
 * - Trigger exato ainda é resolvido só pelo ramo determinístico (sem chamar NLU).
 */
describe("NlpFlowClassifier / FlowExtractionOrchestrator — treino e classificação", () => {
  const trainSpy = vi.spyOn(NlpManager.prototype, "train");

  let orchestrator: FlowExtractionOrchestrator;

  beforeAll(async () => {
    orchestrator = new FlowExtractionOrchestrator(flowRegistry);
    await orchestrator.initialize();
  });

  afterAll(() => {
    trainSpy.mockRestore();
  });

  it("chama train() do NlpManager durante initialize (biblioteca efetivamente treinada)", () => {
    expect(trainSpy).toHaveBeenCalled();
  });

  it("quando o texto não casa com menu/triggers, o NLU roda e devolve intent + score em nlpClassification", async () => {
    const text =
      "mensagem longa zzz quero entender multa bancaria abusiva sem usar palavras fixas do menu xxx";
    expect(text.toLowerCase().includes("cobrança indevida")).toBe(false);

    const outcome = await orchestrator.findByMessage(text, flowRegistry);

    expect(outcome.match).toBeNull();
    expect(outcome.nlpClassification).not.toBeNull();
    expect(typeof outcome.nlpClassification!.intent).toBe("string");
    expect(typeof outcome.nlpClassification!.score).toBe("number");
  });

  it("trigger contíguo aos fluxos mantém NLU de fora: nlpClassification fica null", async () => {
    const outcome = await orchestrator.findByMessage("cancelar serviço", flowRegistry);

    expect(outcome.match && "id" in outcome.match && outcome.match.id).toBe("cancelamento_plano");
    expect(outcome.nlpClassification).toBeNull();
  });
});
