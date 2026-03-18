import { beforeEach, describe, expect, it, vi } from "vitest";
import { WhatsAppClient } from "../../src/whatsapp/whatsapp-client";

const onMock = vi.fn();
const initializeMock = vi.fn();
const logIncomingMessageMock = vi.fn();
const processIncomingMessageMock = vi.fn();

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

vi.mock("../../src/messages/message-log.service", () => {
  class MockMessageLogService {
    logIncomingMessage = logIncomingMessageMock;
  }

  return {
    MessageLogService: MockMessageLogService
  };
});

vi.mock("../../src/messages/message-processor.service", () => {
  class MockMessageProcessorService {
    processIncomingMessage = processIncomingMessageMock.mockResolvedValue(
      "Resposta processada"
    );
  }

  return {
    MessageProcessorService: MockMessageProcessorService
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
    expect(logIncomingMessageMock).not.toHaveBeenCalled();
    expect(processIncomingMessageMock).not.toHaveBeenCalled();
  });

  it("deve registrar e encaminhar mensagem válida para processamento", async () => {
    const client = new WhatsAppClient();
    const reply = vi.fn();

    await client.handleIncomingMessage({
      fromMe: false,
      from: "5511999999999@c.us",
      body: "quero cancelar uma compra",
      reply
    } as any);

    expect(logIncomingMessageMock).toHaveBeenCalledTimes(1);
    expect(processIncomingMessageMock).toHaveBeenCalledTimes(1);
    expect(processIncomingMessageMock).toHaveBeenCalledWith(
      "5511999999999@c.us",
      "quero cancelar uma compra"
    );
    expect(reply).toHaveBeenCalledWith("Resposta processada");
  });
});