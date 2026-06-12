import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetTopicKpiUseCase } from "../../src/application/use-cases/GetTopicKpiUseCase";
import { ConversationExtractionLogModel } from "../../src/database/models/conversation-extraction-log.model";

vi.mock("../../src/database/models/conversation-extraction-log.model", () => ({
  ConversationExtractionLogModel: {
    aggregate: vi.fn()
  }
}));

describe("GetTopicKpiUseCase", () => {
  const useCase = new GetTopicKpiUseCase();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("agrega assuntos por flowId contando uma vez por sessionId e flowId", async () => {
    vi.mocked(ConversationExtractionLogModel.aggregate).mockResolvedValue([
      { _id: "cobranca_indevida", count: 3 },
      { _id: "garantia_produto", count: 2 },
      { _id: "novo_fluxo", count: 1 }
    ]);

    const result = await useCase.execute();

    expect(ConversationExtractionLogModel.aggregate).toHaveBeenCalledWith([
      { $match: { flowId: { $exists: true, $nin: [null, ""] } } },
      { $group: { _id: { sessionId: "$sessionId", flowId: "$flowId" } } },
      { $group: { _id: "$_id.flowId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    expect(result).toEqual([
      { flowId: "cobranca_indevida", name: "Cobrança indevida", value: 3 },
      { flowId: "garantia_produto", name: "Garantia de produto", value: 2 },
      { flowId: "novo_fluxo", name: "Novo fluxo", value: 1 }
    ]);
  });

  it("respeita limite customizado na agregacao", async () => {
    vi.mocked(ConversationExtractionLogModel.aggregate).mockResolvedValue([]);

    await useCase.execute(5);

    expect(ConversationExtractionLogModel.aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([{ $limit: 5 }])
    );
  });
});
