import mongoose, { type ConnectOptions } from "mongoose";

import { getMongoEnv } from "./env";
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

  console.log(`[MongoDB] Conectando em: ${redactUri(uri)}`);

  const options: ConnectOptions = {
    authSource: "admin",
    retryWrites: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
  };

  if (dbName) {
    options.dbName = dbName;
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[MongoDB] Tentativa ${attempt}/${MAX_RETRIES}...`);
      await mongoose.connect(uri, options);
      didConnect = true;
      console.log(`[MongoDB] Conectado com sucesso na tentativa ${attempt}.`);
      return;
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[MongoDB] Tentativa ${attempt}/${MAX_RETRIES} falhou: ${message}`
      );

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * attempt;
        console.log(`[MongoDB] Aguardando ${delay}ms antes de tentar novamente...`);
        await sleep(delay);
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
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
}
