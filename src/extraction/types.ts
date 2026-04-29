import type {
  FlowDefinition,
  FlowMatcherResult,
  MatcherInvalidMenuNumber,
  MatcherReturnToMenu
} from "../types/flow";

export interface FlowNlpClassification {
  readonly intent: string;
  readonly score: number;
}

/**
 * Resultado do encadeamento determinístico + NLU antes de escolher fluxo novo.
 */
export interface FlowMatchOutcome {
  readonly match: FlowMatcherResult;
  /** Preenchido apenas quando houve chamada ao classificador node-nlp. */
  readonly nlpClassification?: FlowNlpClassification | null;
}

export interface StructuralEntity {
  readonly type: StructuralEntityKind;
  readonly value: string;
  readonly rawMatch: string;
}

export type StructuralEntityKind =
  | "cpf"
  | "cnpj"
  | "email"
  | "telefone_br"
  | "valor_brl"
  | "data_dd_mm_yyyy";

export type { FlowMatcherResult, FlowDefinition, MatcherInvalidMenuNumber, MatcherReturnToMenu };
