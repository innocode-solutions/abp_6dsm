import { beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrap } from "../../src/server";

const startMock = vi.fn();
const messageProcessorConstructorSpy = vi.fn();
const markdownRepositoryConstructorSpy = vi.fn();
const semanticRepositoryConstructorSpy = vi.fn();
const semanticRepositoryInitializeSpy = vi.fn().mockResolvedValue(undefined);
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

  class MockSemanticCdcRepository {
    constructor(embeddingService: unknown) {
      semanticRepositoryConstructorSpy(embeddingService);
    }
    initialize = semanticRepositoryInitializeSpy;
  }

  class MockKnowledgeService {
    constructor(repository: unknown, llmService?: unknown) {
      knowledgeServiceConstructorSpy(repository, llmService);
    }
  }

  return {
    MarkdownCdcRepository: MockMarkdownCdcRepository,
    SemanticCdcRepository: MockSemanticCdcRepository,
    KnowledgeService: MockKnowledgeService
  };
});

vi.mock("../../src/rag", () => {
  class MockGeminiEmbeddingService {
    constructor(_apiKey: string) {}
  }

  class MockGeminiLlmService {
    constructor(_apiKey: string) {}
  }

  return {
    GeminiEmbeddingService: MockGeminiEmbeddingService,
    GeminiLlmService: MockGeminiLlmService
  };
});

describe("server bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "test";
  });

  it("deve inicializar o bot", async () => {
    delete process.env.GEMINI_API_KEY;

    await bootstrap();

    expect(startMock).toHaveBeenCalledTimes(1);
  });

  describe("sem GEMINI_API_KEY (fallback keyword)", () => {
    beforeEach(() => {
      delete process.env.GEMINI_API_KEY;
    });

    it("deve usar MarkdownCdcRepository e injetar no MessageProcessorService", async () => {
      await bootstrap();

      expect(markdownRepositoryConstructorSpy).toHaveBeenCalledTimes(1);
      expect(semanticRepositoryConstructorSpy).not.toHaveBeenCalled();
      expect(knowledgeServiceConstructorSpy).toHaveBeenCalledTimes(1);
      expect(messageProcessorConstructorSpy).toHaveBeenCalledTimes(1);

      const knowledgeServiceArg = messageProcessorConstructorSpy.mock.calls[0][3];
      expect(knowledgeServiceArg).toBeDefined();
    });
  });

  describe("com GEMINI_API_KEY (RAG semântico)", () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = "test-api-key";
    });

    afterEach(() => {
      delete process.env.GEMINI_API_KEY;
    });

    it("deve usar SemanticCdcRepository e inicializar o RAG", async () => {
      await bootstrap();

      expect(semanticRepositoryConstructorSpy).toHaveBeenCalledTimes(1);
      expect(semanticRepositoryInitializeSpy).toHaveBeenCalledTimes(1);
      expect(markdownRepositoryConstructorSpy).not.toHaveBeenCalled();
      expect(knowledgeServiceConstructorSpy).toHaveBeenCalledTimes(1);
      expect(messageProcessorConstructorSpy).toHaveBeenCalledTimes(1);
    });

    it("deve passar LLM service ao KnowledgeService no modo RAG", async () => {
      await bootstrap();

      const [_repository, llmService] = knowledgeServiceConstructorSpy.mock.calls[0];
      expect(llmService).toBeDefined();
    });
  });
});
