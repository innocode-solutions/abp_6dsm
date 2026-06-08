import mongoose, { type ConnectOptions } from "mongoose";

import { getMongoEnv } from "./env";
import { logger } from "../monitoring/logger";

import "./models/chat-message.model";
import "./models/chat-session.model";
import "./models/rag-index.model";
import "./models/whatsapp-session.model";

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 2000;

let didConnect = false;

export function isMongoConfigured(): boolean {
  return Boolean(getMongoEnv().uri);
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

function redactUri(uri: string): string {
  try {
    const parsed = new URL(uri);

    if (parsed.password) {
      parsed.password = "***";
    }

    return parsed.toString();
  } catch {
    return "<unparseable URI>";
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connectMongo(): Promise<void> {
  const { uri, dbName } = getMongoEnv();

  if (!uri) {
    throw new Error("MONGODB_URI não configurada.");
  }

  logger.info("Conectando ao MongoDB.", {
    module: "MONGODB",
    uri: redactUri(uri),
    dbName: dbName ?? null
  });

  const options: ConnectOptions = {
    authSource: "admin",
    retryWrites: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000
  };

  if (dbName) {
    options.dbName = dbName;
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info("Tentando conectar ao MongoDB.", {
        module: "MONGODB",
        attempt,
        maxRetries: MAX_RETRIES
      });

      await mongoose.connect(uri, options);

      didConnect = true;

      logger.info("MongoDB conectado com sucesso.", {
        module: "MONGODB",
        attempt
      });

      return;
    } catch (err) {
      lastError = err;

      const message = err instanceof Error ? err.message : String(err);

      logger.error("Falha ao conectar ao MongoDB.", {
        module: "MONGODB",
        attempt,
        maxRetries: MAX_RETRIES,
        error: message
      });

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * attempt;

        logger.warn("Aguardando antes de tentar conectar ao MongoDB novamente.", {
          module: "MONGODB",
          delayMs: delay,
          nextAttempt: attempt + 1
        });

        await sleep(delay);
      }
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : String(lastError);

  throw new Error(
    `[MongoDB] Falha ao conectar após ${MAX_RETRIES} tentativas em ${redactUri(uri)}: ${message}`
  );
}

export async function disconnectMongo(): Promise<void> {
  if (!didConnect) {
    return;
  }

  await mongoose.disconnect();

  didConnect = false;

  logger.info("MongoDB desconectado com sucesso.", {
    module: "MONGODB"
  });
}