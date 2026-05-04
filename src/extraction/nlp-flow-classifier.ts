import { NlpManager } from "node-nlp";
import type { FlowDefinition } from "../types/flow";
import type { FlowNlpClassification } from "./types";

/** Intenções genéricas fora dos fluxos (saudações, ruído) — mapeadas a `match` nulo pelo orquestrador. */
export const NLP_NONE_INTENT = "abp.none";

/**
 * Confiança mínima para aceitar intenção como fluxo (abaixo disso o orquestrador
 * retorna `match: null` e o processador pode seguir para RAG / mensagem genérica).
 */
export const NLP_MIN_FLOW_SCORE = 0.65;

const DEFAULT_MIN_SCORE = NLP_MIN_FLOW_SCORE;

/** Frases típicas de ruído/curtas que não devem abrir fluxo sozinhas — reforço do intent `abp.none`. */
const NONE_STEM_PHRASES_PT: readonly string[] = [
  "oi",
  "olá",
  "ola",
  "oie",
  "oi bom dia",
  "oi boa tarde",
  "tudo bem",
  "opa",
  "teste",
  "testando",
  "abc",
  "xyz",
  "não sei",
  "nao sei",
  "ok",
  "certo",
  "beleza",
  "blz",
  "valeu",
  "obrigado",
  "obrigada",
  "obg"
];

export class NlpFlowClassifier {
  private manager: NlpManager | null = null;

  constructor(
    private readonly minScore: number = DEFAULT_MIN_SCORE,
    private readonly noneIntentId: string = NLP_NONE_INTENT
  ) {}

  async initialize(flows: FlowDefinition[]): Promise<void> {
    this.manager = new NlpManager({
      languages: ["pt"],
      nlu: { useNoneFeature: true, log: false }
    });

    for (const phrase of NONE_STEM_PHRASES_PT) {
      this.manager.addDocument("pt", phrase, this.noneIntentId);
    }

    for (const flow of flows) {
      for (const trigger of flow.triggers) {
        this.manager.addDocument("pt", trigger, flow.id);
      }
      this.manager.addDocument("pt", flow.title.toLowerCase(), flow.id);
    }

    await this.manager.train();
  }

  /** Classifica intenção; deve ser chamado só após `initialize`. */
  async classify(rawMessage: string): Promise<FlowNlpClassification> {
    const text = rawMessage.trim();
    if (!this.manager) {
      throw new Error("NlpFlowClassifier: initialize(flows) precisa ser chamado antes.");
    }
    const result = await this.manager.process("pt", text);
    return {
      intent: String(result.intent ?? "None"),
      score: typeof result.score === "number" ? result.score : 0
    };
  }

  getMinScore(): number {
    return this.minScore;
  }

  getNoneIntentId(): string {
    return this.noneIntentId;
  }
}

export function classificationAcceptsFlow(
  classification: FlowNlpClassification,
  flowsById: ReadonlyMap<string, FlowDefinition>,
  noneIntentId: string,
  minScore: number
): FlowDefinition | null {
  const id = classification.intent;
  if (id === "None" || id === noneIntentId) {
    return null;
  }
  if (classification.score < minScore) {
    return null;
  }
  return flowsById.get(id) ?? null;
}
