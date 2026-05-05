import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProconBot } from "../../src/bot/bot";

describe("ProconBot", () => {
  const mockProvider = {
    initialize: vi.fn(),
    onMessage: vi.fn()
  };

  const mockProcessor = {
    processIncomingMessage: vi.fn().mockResolvedValue("Bot Response")
  };

  const mockLogService = {
    logIncomingMessage: vi.fn().mockResolvedValue(undefined),
    logOutgoingMessage: vi.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve inicializar o provider e registrar handler de mensagem", async () => {
    const bot = new ProconBot(
      mockProvider as any,
      mockProcessor as any,
      mockLogService as any
    );
    await bot.start();

    expect(mockProvider.initialize).toHaveBeenCalledTimes(1);
    expect(mockProvider.onMessage).toHaveBeenCalledTimes(1);
  });

  it("deve processar mensagem e responder via reply do provider", async () => {
    let messageHandler: any;
    const providerWithHandler = {
      ...mockProvider,
      onMessage: vi.fn((handler) => {
        messageHandler = handler;
      })
    };

    const bot = new ProconBot(
      providerWithHandler as any,
      mockProcessor as any,
      mockLogService as any
    );
    await bot.start();

    const replyMock = vi.fn();
    const mockMessage = {
      from: "user123",
      body: "ola",
      timestamp: "2024-01-01",
      reply: replyMock
    };

    await messageHandler(mockMessage);

    expect(mockLogService.logIncomingMessage).toHaveBeenCalledTimes(1);
    expect(mockProcessor.processIncomingMessage).toHaveBeenCalledTimes(1);
    expect(mockProcessor.processIncomingMessage).toHaveBeenCalledWith("user123", "ola");
    expect(mockLogService.logOutgoingMessage).toHaveBeenCalledTimes(1);
    expect(replyMock).toHaveBeenCalledWith("Bot Response");
  });

  it("injeta sessionId no processador quando o serviço Mongo retorna identificador", async () => {
    let messageHandler: any;
    const providerWithHandler = {
      ...mockProvider,
      onMessage: vi.fn((handler) => {
        messageHandler = handler;
      })
    };

    const sessionSvc = {
      getOrCreateSessionId: vi.fn().mockResolvedValue("507f1f77bcf86cd799439011")
    };

    const bot = new ProconBot(
      providerWithHandler as any,
      mockProcessor as any,
      mockLogService as any,
      sessionSvc as any
    );
    await bot.start();

    await messageHandler({
      from: "5511999999999@c.us",
      body: "oi",
      timestamp: "2024-01-01",
      reply: vi.fn()
    });

    expect(sessionSvc.getOrCreateSessionId).toHaveBeenCalledWith("5511999999999@c.us");
    expect(mockProcessor.processIncomingMessage).toHaveBeenCalledWith(
      "5511999999999@c.us",
      "oi",
      { sessionId: "507f1f77bcf86cd799439011" }
    );
  });
});
