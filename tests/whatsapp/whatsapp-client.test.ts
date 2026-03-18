import { beforeEach, describe, expect, it, vi } from "vitest";
import { WhatsAppClient } from "../../src/whatsapp/whatsapp-client";

const onMock = vi.fn();
const initializeMock = vi.fn();

vi.mock("qrcode-terminal", () => ({
  default: {
    generate: vi.fn()
  }
}));

vi.mock("whatsapp-web.js", () => {
  class MockClient {
    on = onMock;
    initialize = initializeMock;
  }

  class MockLocalAuth {}

  return {
    Client: MockClient,
    LocalAuth: MockLocalAuth
  };
});

describe("WhatsAppClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve registrar eventos ao instanciar", () => {
    new WhatsAppClient();

    expect(onMock).toHaveBeenCalled();
  });

  it("deve chamar initialize no client interno", async () => {
    const client = new WhatsAppClient();

    await client.initialize();

    expect(initializeMock).toHaveBeenCalledTimes(1);
  });

  it("deve ignorar mensagem enviada pelo próprio bot", async () => {
    const client = new WhatsAppClient();
    const reply = vi.fn();

    await client.handleIncomingMessage({
      fromMe: true,
      from: "5511999999999@c.us",
      body: "oi",
      reply
    } as any);

    expect(reply).not.toHaveBeenCalled();
  });

  it("deve ignorar mensagens de status", async () => {
    const client = new WhatsAppClient();
    const reply = vi.fn();

    await client.handleIncomingMessage({
      fromMe: false,
      from: "status@broadcast",
      body: "oi",
      reply
    } as any);

    expect(reply).not.toHaveBeenCalled();
  });

  it("deve ignorar mensagens de grupo", async () => {
    const client = new WhatsAppClient();
    const reply = vi.fn();

    await client.handleIncomingMessage({
      fromMe: false,
      from: "123456@g.us",
      body: "oi",
      reply
    } as any);

    expect(reply).not.toHaveBeenCalled();
  });

  it("deve responder mensagens válidas", async () => {
    const client = new WhatsAppClient();
    const reply = vi.fn();

    await client.handleIncomingMessage({
      fromMe: false,
      from: "5511999999999@c.us",
      body: "oi",
      reply
    } as any);

    expect(reply).toHaveBeenCalledTimes(1);
  });
});