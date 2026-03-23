import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProconBot } from "../../src/bot/bot";

const logIncomingMessageMock = vi.fn();
const processIncomingMessageMock = vi.fn();

vi.mock("../../src/messages/message-log.service", () => {
  class MockMessageLogService {
    logIncomingMessage = logIncomingMessageMock;
  }
  return { MessageLogService: MockMessageLogService };
});

vi.mock("../../src/messages/message-processor.service", () => {
  class MockMessageProcessorService {
    processIncomingMessage = processIncomingMessageMock.mockResolvedValue("Bot Response");
  }
  return { MessageProcessorService: MockMessageProcessorService };
});

describe("ProconBot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve inicializar o provider e registrar handler de mensagem", async () => {
    const mockProvider = {
      initialize: vi.fn(),
      onMessage: vi.fn()
    };

    const bot = new ProconBot(mockProvider as any);
    await bot.start();

    expect(mockProvider.initialize).toHaveBeenCalledTimes(1);
    expect(mockProvider.onMessage).toHaveBeenCalledTimes(1);
  });

  it("deve processar mensagem e responder via reply do provider", async () => {
    let messageHandler: any;
    const mockProvider = {
      initialize: vi.fn(),
      onMessage: vi.fn((handler) => { messageHandler = handler; })
    };

    const bot = new ProconBot(mockProvider as any);
    await bot.start();

    const replyMock = vi.fn();
    const mockMessage = {
      from: "user123",
      body: "ola",
      timestamp: "2024-01-01",
      reply: replyMock
    };

    await messageHandler(mockMessage);

    expect(logIncomingMessageMock).toHaveBeenCalledTimes(1);
    expect(processIncomingMessageMock).toHaveBeenCalledTimes(1);
    expect(processIncomingMessageMock).toHaveBeenCalledWith("user123", "ola");
    expect(replyMock).toHaveBeenCalledWith("Bot Response");
  });
});
