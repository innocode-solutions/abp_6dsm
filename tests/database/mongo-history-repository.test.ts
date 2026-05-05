import { describe, expect, it, vi, beforeEach } from "vitest";
import { MongoHistoryRepository } from "../../src/database/repositories/mongo-history-repository";
import { ChatMessageModel } from "../../src/database/models/chat-message.model";

vi.mock("../../src/database/models/chat-message.model", () => {
  return {
    ChatMessageModel: {
      create: vi.fn(),
      find: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      exec: vi.fn()
    }
  };
});

describe("MongoHistoryRepository", () => {
  const repository = new MongoHistoryRepository();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve salvar uma mensagem no banco de dados", async () => {
    const message = {
      from: "user-123",
      body: "Oi",
      direction: "in" as const,
      timestamp: "2024-01-01T10:00:00Z"
    };

    await repository.save(message);

    expect(ChatMessageModel.create).toHaveBeenCalledWith({
      from: "user-123",
      direction: "in",
      body: "Oi",
      clientTimestamp: "2024-01-01T10:00:00Z"
    });
  });

  it("deve recuperar mensagens de um usuário ordenadas por criação", async () => {
    const mockData = [
      { from: "user-1", body: "A", direction: "in", clientTimestamp: "T1" },
      { from: "user-1", body: "B", direction: "out", clientTimestamp: "T2" }
    ];

    (ChatMessageModel as any).exec.mockResolvedValue(mockData);

    const result = await repository.findByUser("user-1");

    expect(ChatMessageModel.find).toHaveBeenCalledWith({ from: "user-1" });
    expect((ChatMessageModel as any).sort).toHaveBeenCalledWith({ createdAt: 1 });
    expect(result).toHaveLength(2);
    expect(result[0].body).toBe("A");
    expect(result[1].direction).toBe("out");
  });
});
