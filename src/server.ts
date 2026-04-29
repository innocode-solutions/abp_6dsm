import "dotenv/config";

import { ProconBot } from "./bot/bot";
import { connectMongo, isMongoConfigured } from "./database/connection";
import { MongoEntityExtractionRepository } from "./database/repositories/mongo-entity-extraction-repository";
import { MongoHistoryRepository } from "./database/repositories/mongo-history-repository";
import { FlowEngine } from "./engine/flow-engine";
import { FlowExtractionOrchestrator } from "./flows/flow-matcher";
import { flowRegistry } from "./flows/flow-registry";
import {
  KnowledgeService,
  MarkdownCdcRepository,
  SemanticCdcRepository
} from "./knowledge";
import { MessageLogService } from "./messages/message-log.service";
import { MessageProcessorService } from "./messages/message-processor.service";
import { GeminiEmbeddingService, GeminiLlmService } from "./rag";
import { InMemorySessionStore } from "./sessions/in-memory-session-store";
import { MongoConversationSessionIdService } from "./sessions/mongo-conversation-session-id.service";
import { WhatsAppProvider } from "./whatsapp/whatsapp-provider";

import type { IEntityExtractionRepository } from "./extraction/entity-extraction-repository.interface";
import type { IHistoryRepository } from "./messages/history";

function logFatalError(origin: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(`[Bootstrap] ${origin}: ${error.name}: ${error.message}`);

    if (error.stack) {
      console.error(error.stack);
    }

    return;
  }

  console.error(`[Bootstrap] ${origin}:`, error);
}

process.on("unhandledRejection", (reason) => {
  logFatalError("Promessa rejeitada sem tratamento", reason);
});

process.on("uncaughtException", (error) => {
  logFatalError("Excecao nao capturada", error);
  process.exit(1);
});

export async function bootstrap(): Promise<void> {
  try {
    let historyRepository: IHistoryRepository | undefined;
    let entityRepository: IEntityExtractionRepository | undefined;
    let conversationSessionIds: MongoConversationSessionIdService | undefined;

    if (process.env.NODE_ENV !== "test" && isMongoConfigured()) {
      await connectMongo();
      historyRepository = new MongoHistoryRepository();
      entityRepository = new MongoEntityExtractionRepository();
      conversationSessionIds = new MongoConversationSessionIdService();
    } else if (process.env.NODE_ENV !== "test" && !isMongoConfigured()) {
      console.warn(
        "MONGODB_URI não definido: persistência em MongoDB desabilitada. Defina a variável para ativar."
      );
    }

    const provider = new WhatsAppProvider();
    const logService = new MessageLogService(historyRepository);

    const flowEngine = new FlowEngine();
    const flowMatcher = new FlowExtractionOrchestrator(flowRegistry);
    await flowMatcher.initialize();
    const sessionStore = new InMemorySessionStore();

    // RAG: usa busca semântica + LLM se GEMINI_API_KEY estiver configurada
    const geminiApiKey = process.env.GEMINI_API_KEY;
    let knowledgeService: KnowledgeService;

    if (geminiApiKey) {
      const embeddingService = new GeminiEmbeddingService(geminiApiKey);
      const llmService = new GeminiLlmService(geminiApiKey);
      const knowledgeRepository = new SemanticCdcRepository(embeddingService);

      await knowledgeRepository.initialize();

      knowledgeService = new KnowledgeService(knowledgeRepository, llmService);
      console.log("[RAG] Busca semântica e geração com LLM ativadas.");
    } else {
      console.warn(
        "[RAG] GEMINI_API_KEY não definida: usando busca por keyword sem LLM."
      );
      knowledgeService = new KnowledgeService(new MarkdownCdcRepository());
    }

    const processor = new MessageProcessorService(
      flowEngine,
      flowMatcher,
      sessionStore,
      knowledgeService,
      entityRepository
    );

    const bot = new ProconBot(
      provider,
      processor,
      logService,
      conversationSessionIds
    );

    await bot.start();

    console.log(
      "Servidor iniciado com arquitetura de provedores e persistência."
    );
  } catch (error) {
    console.error("Erro ao iniciar aplicação:", error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  bootstrap();
}
