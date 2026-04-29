import type { FlowDefinition } from "../types/flow";
import { IFlowMatcher } from "../flows/flow-matcher.interface";
import { matchFlowDeterministic } from "./deterministic-flow-match";
import {
  NlpFlowClassifier,
  classificationAcceptsFlow,
  NLP_NONE_INTENT
} from "./nlp-flow-classifier";
import type { FlowMatchOutcome, FlowNlpClassification } from "./types";

/**
 * Preserva a navegação do FlowMatcher (menu, números, triggers) e aplica
 * node-nlp apenas quando o ramo determinístico retorna `null`.
 */
export class FlowExtractionOrchestrator implements IFlowMatcher {
  private readonly classifier: NlpFlowClassifier;
  private flowsById: ReadonlyMap<string, FlowDefinition> = new Map();
  private ready = false;

  constructor(
    private readonly flows: FlowDefinition[],
    classifier?: NlpFlowClassifier
  ) {
    this.classifier = classifier ?? new NlpFlowClassifier();
  }

  async initialize(): Promise<void> {
    this.flowsById = new Map(this.flows.map((f) => [f.id, f]));
    await this.classifier.initialize(this.flows);
    this.ready = true;
  }

  ensureReady(): void {
    if (!this.ready) {
      throw new Error(
        "FlowExtractionOrchestrator: chame await initialize() antes de processar mensagens."
      );
    }
  }

  async findByMessage(message: string, flows: FlowDefinition[]): Promise<FlowMatchOutcome> {
    this.ensureReady();

    const det = matchFlowDeterministic(message, flows);
    if (det !== null) {
      return { match: det, nlpClassification: null };
    }

    const nlp = await this.classifier.classify(message);
    const noneId = this.classifier.getNoneIntentId();
    const minScore = this.classifier.getMinScore();

    const flow = classificationAcceptsFlow(
      nlp,
      this.flowsById,
      noneId,
      minScore
    );

    const meta: FlowNlpClassification = nlp;

    if (flow) {
      return { match: flow, nlpClassification: meta };
    }

    return { match: null, nlpClassification: meta };
  }
}

/** Expõe constante de intent de ruído para testes e persistência. */
export { NLP_NONE_INTENT };
