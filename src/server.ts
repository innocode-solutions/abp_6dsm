import "dotenv/config";

import {
  AgendamentoApiClient,
  AgendamentoConversationService,
  InMemoryAgendamentoSessionStore
} from "./agendamento";
import { ProconBot } from "./bot/bot";
import { createHttpServer } from "./api/server-http";
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
import { MongoSessionStore } from "./sessions/mongo-session-store";
import { ISessionStore } from "./sessions/session-store.interface";
import { WhatsAppProvider } from "./whatsapp/whatsapp-provider";

import { logger } from "./monitoring/logger";
import type { IEntityExtractionRepository } from "./extraction/entity-extraction-repository.interface";
import type { AgendamentoConversationHandler } from "./agendamento";
import type { IHistoryRepository } from "./messages/history";

function logBootstrapError(origin: string, error: unknown): void {
  if (error instanceof Error) {
    logger.error(`[Bootstrap] ${origin}: ${error.name}: ${error.message}`, error);
    return;
  }

  logger.error(`[Bootstrap] ${origin}: erro desconhecido`, { error });
}

process.on("unhandledRejection", (reason) => {
  logBootstrapError("Promessa rejeitada sem tratamento", reason);
});

process.on("uncaughtException", (error) => {
  logBootstrapError("Exceção não capturada", error);
  process.exit(1);
});

function createAgendamentoConversation(): AgendamentoConversationHandler | undefined {
  const baseUrl = process.env.AGENDAMENTO_API_BASE_URL?.trim();
  const apiKey = process.env.CHATBOT_API_KEY?.trim();

  if (!baseUrl || !apiKey) {
    logger.warn("Agendamento desabilitado: variáveis de ambiente ausentes.", {
      module: "AGENDAMENTO",
      hasBaseUrl: Boolean(baseUrl),
      hasApiKey: Boolean(apiKey)
    });

    return undefined;
  }

  const apiClient = new AgendamentoApiClient({ baseUrl, apiKey });

  logger.info("Agendamento habilitado.", {
    module: "AGENDAMENTO"
  });

  return new AgendamentoConversationService(
    apiClient,
    new InMemoryAgendamentoSessionStore()
  );
}

export async function bootstrap(): Promise<void> {
  try {
    let historyRepository: IHistoryRepository | undefined;
    let entityRepository: IEntityExtractionRepository | undefined;
    let conversationSessionIds: MongoConversationSessionIdService | undefined;
    let sessionStore: ISessionStore = new InMemorySessionStore();

    logger.info("Iniciando bootstrap da aplicação.", {
      module: "BOOTSTRAP",
      nodeEnv: process.env.NODE_ENV
    });

    if (process.env.NODE_ENV !== "test" && isMongoConfigured()) {
      try {
        logger.info("Tentando conectar ao MongoDB.", {
          module: "MONGODB"
        });

        await connectMongo();

        historyRepository = new MongoHistoryRepository();
        entityRepository = new MongoEntityExtractionRepository();
        conversationSessionIds = new MongoConversationSessionIdService();
        sessionStore = new MongoSessionStore();

        logger.info("MongoDB conectado com sucesso.", {
          module: "MONGODB"
        });
      } catch (error) {
        logger.warn(
          "Falha ao conectar no MongoDB: persistência em MongoDB desabilitada. Usando sessão em memória.",
          { module: "MONGODB" }
        );

        logBootstrapError("Detalhes da falha de conexão MongoDB", error);
      }
    } else if (process.env.NODE_ENV !== "test" && !isMongoConfigured()) {
      logger.warn(
        "MONGODB_URI não definido: persistência em MongoDB desabilitada. Defina a variável para ativar.",
        { module: "MONGODB" }
      );
    }

    const provider = new WhatsAppProvider();
    const logService = new MessageLogService(historyRepository);

    const flowEngine = new FlowEngine();
    const flowMatcher = new FlowExtractionOrchestrator(flowRegistry);

    await flowMatcher.initialize();

    logger.info("Fluxos inicializados com sucesso.", {
      module: "FLOW"
    });

    const geminiApiKey = process.env.GEMINI_API_KEY;
    let knowledgeService: KnowledgeService;

    if (geminiApiKey) {
      const embeddingService = new GeminiEmbeddingService(geminiApiKey);
      const llmService = new GeminiLlmService(geminiApiKey);
      const knowledgeRepository = new SemanticCdcRepository(embeddingService);

      logger.info("Inicializando repositório semântico do RAG.", {
        module: "RAG"
      });

      await knowledgeRepository.initialize();

      knowledgeService = new KnowledgeService(knowledgeRepository, llmService);

      logger.info("Busca semântica e geração com LLM ativadas.", {
        module: "RAG"
      });
    } else {
      logger.warn(
        "GEMINI_API_KEY não definida: usando busca por keyword sem LLM.",
        { module: "RAG" }
      );

      knowledgeService = new KnowledgeService(new MarkdownCdcRepository());
    }

    const agendamentoConversation = createAgendamentoConversation();

    const processor = new MessageProcessorService(
      flowEngine,
      flowMatcher,
      sessionStore,
      knowledgeService,
      entityRepository,
      agendamentoConversation
    );

    const bot = new ProconBot(
      provider,
      processor,
      logService,
      conversationSessionIds
    );

    await bot.start();

    logger.info("Bot WhatsApp iniciado com sucesso.", {
      module: "BOT"
    });

    const httpApp = createHttpServer({ historyRepository });
    const httpPort = Number(process.env.HTTP_PORT ?? 3000);

    if (process.env.NODE_ENV !== "test") {
      httpApp.listen(httpPort, () => {
        logger.info("Servidor HTTP iniciado.", {
          module: "API",
          port: httpPort,
          kpiEnabled: Boolean(historyRepository)
        });
      });
    }

    logger.info("Aplicação iniciada com arquitetura de provedores e persistência.", {
      module: "BOOTSTRAP"
    });
  } catch (error) {
    logBootstrapError("Erro ao iniciar aplicação", error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  bootstrap();
}