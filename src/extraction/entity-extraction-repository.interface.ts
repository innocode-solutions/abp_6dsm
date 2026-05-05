import type { FlowNlpClassification, StructuralEntity } from "./types";

export interface EntityExtractionLogPayload {
  readonly sessionId: string;
  readonly userId: string;
  readonly body: string;
  readonly structuralEntities: StructuralEntity[];
  readonly nlpClassification: FlowNlpClassification | null;
  /** Fluxo PROCON associado quando a mensagem faz parte da sessão de um fluxo. */
  readonly flowId?: string;
}

export interface IEntityExtractionRepository {
  appendExtraction(payload: EntityExtractionLogPayload): Promise<void>;
}
