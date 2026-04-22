import "dotenv/config";

import { ProconBot } from "./bot/bot";
import { connectMongo, isMongoConfigured } from "./database/connection";
import { MongoHistoryRepository } from "./database/repositories/mongo-history-repository";
import { FlowEngine } from "./engine/flow-engine";
import { FlowMatcher } from "./flows/flow-matcher";
import { KnowledgeService, MarkdownCdcRepository } from "./knowledge";
import { MessageLogService } from "./messages/message-log.service";
import { MessageProcessorService } from "./messages/message-processor.service";
import { InMemorySessionStore } from "./sessions/in-memory-session-store";
import { WhatsAppProvider } from "./whatsapp/whatsapp-provider";

import { IHistoryRepository } from "./messages/history";

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

    if (process.env.NODE_ENV !== "test" && isMongoConfigured()) {
      await connectMongo();
      historyRepository = new MongoHistoryRepository();
    } else if (process.env.NODE_ENV !== "test" && !isMongoConfigured()) {
      console.warn(
        "MONGODB_URI não definido: persistência em MongoDB desabilitada. Defina a variável para ativar."
      );
    }

    const provider = new WhatsAppProvider();
    const logService = new MessageLogService(historyRepository);

    const flowEngine = new FlowEngine();
    const flowMatcher = new FlowMatcher();
    const sessionStore = new InMemorySessionStore();
    const knowledgeRepository = new MarkdownCdcRepository();
    const knowledgeService = new KnowledgeService(knowledgeRepository);

    const processor = new MessageProcessorService(
      flowEngine,
      flowMatcher,
      sessionStore,
      knowledgeService
    );

    const bot = new ProconBot(provider, processor, logService);

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