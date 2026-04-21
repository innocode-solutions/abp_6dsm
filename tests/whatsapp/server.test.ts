import { beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrap } from "../../src/server";

const startMock = vi.fn();
const messageProcessorConstructorSpy = vi.fn();
const markdownRepositoryConstructorSpy = vi.fn();
const knowledgeServiceConstructorSpy = vi.fn();

vi.mock("../../src/bot/bot", () => {
  class MockProconBot {
    start = startMock;
  }

  return {
    ProconBot: MockProconBot
  };
});

vi.mock("../../src/whatsapp/whatsapp-provider", () => {
  class MockWhatsAppProvider {}

  return {
    WhatsAppProvider: MockWhatsAppProvider
  };
});

vi.mock("../../src/messages/message-processor.service", () => {
  class MockMessageProcessorService {
    constructor(
      flowEngine: unknown,
      flowMatcher: unknown,
      sessionStore: unknown,
      knowledgeService: unknown
    ) {
      messageProcessorConstructorSpy(flowEngine, flowMatcher, sessionStore, knowledgeService);
    }
  }

  return {
    MessageProcessorService: MockMessageProcessorService
  };
});

vi.mock("../../src/knowledge", () => {
  class MockMarkdownCdcRepository {
    constructor() {
      markdownRepositoryConstructorSpy();
    }
  }

  class MockKnowledgeService {
    constructor(repository: unknown) {
      knowledgeServiceConstructorSpy(repository);
    }
  }

  return {
    MarkdownCdcRepository: MockMarkdownCdcRepository,
    KnowledgeService: MockKnowledgeService
  };
});

describe("server bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "test";
  });

  it("deve inicializar o bot", async () => {
    await bootstrap();

    expect(startMock).toHaveBeenCalledTimes(1);
  });

  it("deve instanciar base CDC e injetar no MessageProcessorService", async () => {
    await bootstrap();

    expect(markdownRepositoryConstructorSpy).toHaveBeenCalledTimes(1);
    expect(knowledgeServiceConstructorSpy).toHaveBeenCalledTimes(1);
    expect(messageProcessorConstructorSpy).toHaveBeenCalledTimes(1);

    const knowledgeServiceArg = messageProcessorConstructorSpy.mock.calls[0][3];
    const knowledgeRepositoryArg = knowledgeServiceConstructorSpy.mock.calls[0][0];

    expect(knowledgeServiceArg).toBeDefined();
    expect(knowledgeRepositoryArg).toBeDefined();
  });
});