import { beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrap } from "../../src/server";

const initializeMock = vi.fn();

vi.mock("../../src/whatsapp/whatsapp-client", () => {
  class MockWhatsAppClient {
    initialize = initializeMock;
  }

  return {
    WhatsAppClient: MockWhatsAppClient
  };
});

describe("server bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "test";
  });

  it("deve inicializar o cliente do WhatsApp", async () => {
    await bootstrap();

    expect(initializeMock).toHaveBeenCalledTimes(1);
  });
});