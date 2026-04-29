import { beforeEach, describe, expect, it, vi } from "vitest";
import { MongoEntityExtractionRepository } from "../../src/database/repositories/mongo-entity-extraction-repository";
import { ConversationExtractionLogModel } from "../../src/database/models/conversation-extraction-log.model";

vi.mock("../../src/database/models/conversation-extraction-log.model", () => ({
  ConversationExtractionLogModel: {
    create: vi.fn().mockResolvedValue({})
  }
}));

describe("MongoEntityExtractionRepository", () => {
  const repository = new MongoEntityExtractionRepository();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve persistir extração com sessionId e userId", async () => {
    await repository.appendExtraction({
      sessionId: "507f1f77bcf86cd799439011",
      userId: "5511999999999@c.us",
      body: "CPF 529.982.247-25",
      structuralEntities: [
        {
          type: "cpf",
          value: "52998224725",
          rawMatch: "529.982.247-25"
        }
      ],
      nlpClassification: null,
      flowId: "cobranca_indevida"
    });

    expect(ConversationExtractionLogModel.create).toHaveBeenCalledWith({
      sessionId: "507f1f77bcf86cd799439011",
      userId: "5511999999999@c.us",
      body: "CPF 529.982.247-25",
      flowId: "cobranca_indevida",
      structuralEntities: [
        { type: "cpf", value: "52998224725", rawMatch: "529.982.247-25" }
      ],
      nlpClassification: undefined
    });
  });
});
