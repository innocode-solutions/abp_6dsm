import type { ConnectOptions } from "mongoose";

const BASE_OPTIONS = {
  serverSelectionTimeoutMS: 5_000,
} as const;

/**
 * Usa MONGODB_DB_NAME do .env para apontar API e seeds ao mesmo banco
 * (ex.: proconbot_jacarei na Railway), mesmo quando a URI não traz o nome do DB.
 */
export function getMongoConnectOptions(timeoutMs?: number): ConnectOptions {
  const dbName = process.env.MONGODB_DB_NAME?.trim();
  const options: ConnectOptions = {
    ...BASE_OPTIONS,
    ...(timeoutMs !== undefined ? { serverSelectionTimeoutMS: timeoutMs } : {}),
  };

  if (dbName) {
    options.dbName = dbName;
  }

  return options;
}

export function resolveMongoDatabaseLabel(): string {
  const fromEnv = process.env.MONGODB_DB_NAME?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const uri = process.env.MONGODB_URI?.trim() ?? process.env.MONGO_URI?.trim() ?? "";
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match?.[1] ?? "(padrao do driver, ex.: test)";
}
