import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("dotenv", () => ({
  default: {
    config: vi.fn(),
  },
}));

const originalEnv = { ...process.env };

function setMinimalValidEnv(): void {
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/test_db";
  process.env.JWT_SECRET = "jwt-test-secret";
  process.env.CHATBOT_API_KEY = "chatbot-test-key";
}

describe("src/api/config/env", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("usa PORT 3000 quando PORT não está definida", async () => {
    delete process.env.PORT;
    setMinimalValidEnv();
    const { env } = await import("../../src/api/config/env.js");
    expect(env.PORT).toBe(3000);
    expect(env.MONGODB_URI).toBe("mongodb://127.0.0.1:27017/test_db");
    expect(env.JWT_SECRET).toBe("jwt-test-secret");
    expect(env.CHATBOT_API_KEY).toBe("chatbot-test-key");
  });

  it("interpreta PORT quando definida", async () => {
    process.env.PORT = "4000";
    setMinimalValidEnv();
    const { env } = await import("../../src/api/config/env.js");
    expect(env.PORT).toBe(4000);
  });

  it("rejeita PORT inválida", async () => {
    process.env.PORT = "0";
    setMinimalValidEnv();
    await expect(import("../../src/api/config/env.js")).rejects.toThrow(
      "PORT deve ser um número inteiro positivo.",
    );
  });

  it("rejeita MONGODB_URI ausente", async () => {
    delete process.env.MONGODB_URI;
    process.env.JWT_SECRET = "x";
    process.env.CHATBOT_API_KEY = "y";
    await expect(import("../../src/api/config/env.js")).rejects.toThrow(
      "Variável de ambiente obrigatória ausente ou vazia: MONGODB_URI",
    );
  });

  it("rejeita valor só com espaços em JWT_SECRET", async () => {
    setMinimalValidEnv();
    process.env.JWT_SECRET = "   ";
    await expect(import("../../src/api/config/env.js")).rejects.toThrow(
      "Variável de ambiente obrigatória ausente ou vazia: JWT_SECRET",
    );
  });
});
