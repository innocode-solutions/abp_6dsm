import { ConversationExtractionLogModel } from "../models/conversation-extraction-log.model";
import type {
  EntityExtractionLogPayload,
  IEntityExtractionRepository
} from "../../extraction/entity-extraction-repository.interface";

export class MongoEntityExtractionRepository implements IEntityExtractionRepository {
  async appendExtraction(payload: EntityExtractionLogPayload): Promise<void> {
    await ConversationExtractionLogModel.create({
      sessionId: payload.sessionId,
      userId: payload.userId,
      body: payload.body,
      flowId: payload.flowId,
      structuralEntities: payload.structuralEntities,
      nlpClassification: payload.nlpClassification ?? undefined
    });
  }
}
