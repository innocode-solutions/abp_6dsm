import { beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrap } from "../../src/server";

const startMock = vi.fn();

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

describe("server bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "test";
  });

  it("deve inicializar o bot", async () => {
    await bootstrap();

    expect(startMock).toHaveBeenCalledTimes(1);
  });
});