import dotenv from "dotenv";

dotenv.config();

function requireNonEmpty(name: string): string {
  const raw = process.env[name];
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente ou vazia: ${name}`);
  }
  return value;
}

function readPort(): number {
  const raw = process.env.PORT?.trim();
  if (!raw) {
    return 3000;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("PORT deve ser um número inteiro positivo.");
  }
  return parsed;
}

export interface AppEnv {
  PORT: number;
  MONGO_URI: string;
  JWT_SECRET: string;
  CHATBOT_API_KEY: string;
}

export const env: AppEnv = {
  PORT: readPort(),
  MONGO_URI: requireNonEmpty("MONGO_URI"),
  JWT_SECRET: requireNonEmpty("JWT_SECRET"),
  CHATBOT_API_KEY: requireNonEmpty("CHATBOT_API_KEY"),
};
