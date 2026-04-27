import { beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrap } from "../../src/server";

const mocks = vi.hoisted(() => ({
  startMock: vi.fn(),
  messageProcessorConstructorSpy: vi.fn(),
  connectMongoMock: vi.fn().mockResolvedValue(undefined),
  isMongoConfiguredMock: vi.fn(),
  markdownRepositoryConstructorSpy: vi.fn(),
  semanticRepositoryConstructorSpy: vi.fn(),
  semanticRepositoryInitializeSpy: vi.fn().mockResolvedValue(undefined),
  knowledgeServiceConstructorSpy: vi.fn(),
  inMemorySessionStoreConstructorSpy: vi.fn(),
  mongoSessionStoreConstructorSpy: vi.fn()
}));

vi.mock("../../src/database/connection", () => ({
  connectMongo: mocks.connectMongoMock,
  isMongoConfigured: mocks.isMongoConfiguredMock
}));

vi.mock("../../src/bot/bot", () => {
  class MockProconBot {
    start = mocks.startMock;
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
      mocks.messageProcessorConstructorSpy(flowEngine, flowMatcher, sessionStore, knowledgeService);
    }
  }

  return {
    MessageProcessorService: MockMessageProcessorService
  };
});

vi.mock("../../src/knowledge", () => {
  class MockMarkdownCdcRepository {
    constructor() {
      mocks.markdownRepositoryConstructorSpy();
    }
  }

  class MockSemanticCdcRepository {
    constructor(embeddingService: unknown) {
      mocks.semanticRepositoryConstructorSpy(embeddingService);
    }
    initialize = mocks.semanticRepositoryInitializeSpy;
  }

  class MockKnowledgeService {
    constructor(repository: unknown, llmService?: unknown) {
      mocks.knowledgeServiceConstructorSpy(repository, llmService);
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

vi.mock("../../src/sessions/in-memory-session-store", () => {
  class MockInMemorySessionStore {
    constructor() {
      mocks.inMemorySessionStoreConstructorSpy();
    }
  }

  return {
    InMemorySessionStore: MockInMemorySessionStore
  };
});

vi.mock("../../src/sessions/mongo-session-store", () => {
  class MockMongoSessionStore {
    constructor() {
      mocks.mongoSessionStoreConstructorSpy();
    }
  }

  return {
    MongoSessionStore: MockMongoSessionStore
  };
});

describe("server bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "test";
    mocks.isMongoConfiguredMock.mockReturnValue(false);
  });

  it("deve inicializar o bot", async () => {
    delete process.env.GEMINI_API_KEY;

    await bootstrap();

    expect(mocks.startMock).toHaveBeenCalledTimes(1);
  });

  describe("sem GEMINI_API_KEY (fallback keyword)", () => {
    beforeEach(() => {
      delete process.env.GEMINI_API_KEY;
    });

    it("deve usar MarkdownCdcRepository e injetar no MessageProcessorService", async () => {
      await bootstrap();

      expect(mocks.markdownRepositoryConstructorSpy).toHaveBeenCalledTimes(1);
      expect(mocks.semanticRepositoryConstructorSpy).not.toHaveBeenCalled();
      expect(mocks.knowledgeServiceConstructorSpy).toHaveBeenCalledTimes(1);
      expect(mocks.messageProcessorConstructorSpy).toHaveBeenCalledTimes(1);
      expect(mocks.inMemorySessionStoreConstructorSpy).toHaveBeenCalledTimes(1);
      expect(mocks.mongoSessionStoreConstructorSpy).not.toHaveBeenCalled();

      const sessionStoreArg = mocks.messageProcessorConstructorSpy.mock.calls[0][2];
      const knowledgeServiceArg = mocks.messageProcessorConstructorSpy.mock.calls[0][3];
      expect(sessionStoreArg).toBeDefined();
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

      expect(mocks.semanticRepositoryConstructorSpy).toHaveBeenCalledTimes(1);
      expect(mocks.semanticRepositoryInitializeSpy).toHaveBeenCalledTimes(1);
      expect(mocks.markdownRepositoryConstructorSpy).not.toHaveBeenCalled();
      expect(mocks.knowledgeServiceConstructorSpy).toHaveBeenCalledTimes(1);
      expect(mocks.messageProcessorConstructorSpy).toHaveBeenCalledTimes(1);
    });

    it("deve passar LLM service ao KnowledgeService no modo RAG", async () => {
      await bootstrap();

      const [_repository, llmService] = mocks.knowledgeServiceConstructorSpy.mock.calls[0];
      expect(llmService).toBeDefined();
    });
  });

  it("deve usar MongoSessionStore quando estiver fora de teste e o MongoDB conectar", async () => {
    process.env.NODE_ENV = "production";
    mocks.isMongoConfiguredMock.mockReturnValue(true);

    await bootstrap();

    expect(mocks.connectMongoMock).toHaveBeenCalledTimes(1);
    expect(mocks.mongoSessionStoreConstructorSpy).toHaveBeenCalledTimes(1);
  });
});
