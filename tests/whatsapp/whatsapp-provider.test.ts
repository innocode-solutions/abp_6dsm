import { beforeEach, describe, expect, it, vi } from "vitest";
import { WhatsAppProvider } from "../../src/whatsapp/whatsapp-provider";
import qrcode from "qrcode-terminal";

const onMock = vi.fn();
const initializeMock = vi.fn();
const clientMock = vi.fn();
const localAuthMock = vi.fn();

vi.mock("qrcode-terminal", () => ({
  default: {
    generate: vi.fn()
  }
}));

vi.mock("whatsapp-web.js", () => {
  class MockClient {
    constructor(...args: unknown[]) {
      clientMock(...args);
    }

    on = onMock;
    initialize = initializeMock;
  }

  class MockLocalAuth {
    constructor(...args: unknown[]) {
      localAuthMock(...args);
    }
  }

  return {
    Client: MockClient,
    LocalAuth: MockLocalAuth
  };
});

describe("WhatsAppProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.WHATSAPP_PHONE_NUMBER;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deve registrar eventos ao instanciar", () => {
    new WhatsAppProvider();
    expect(onMock).toHaveBeenCalled();
  });

  it("deve chamar initialize no client interno", async () => {
    const provider = new WhatsAppProvider();
    await provider.initialize();
    expect(initializeMock).toHaveBeenCalledTimes(1);
  });

  it("deve habilitar pareamento por codigo quando houver numero configurado", () => {
    process.env.WHATSAPP_PHONE_NUMBER = "+55 (11) 99999-9999";

    new WhatsAppProvider();

    expect(clientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pairWithPhoneNumber: {
          phoneNumber: "5511999999999",
          showNotification: true,
          intervalMs: 180000
        }
      })
    );
  });

  it("nao deve renderizar o QR no terminal quando o modo por codigo estiver ativo", () => {
    process.env.WHATSAPP_PHONE_NUMBER = "5511999999999";

    new WhatsAppProvider();

    const qrCall = onMock.mock.calls.find(call => call[0] === "qr");
    const qrCallback = qrCall![1];

    qrCallback("conteudo-do-qr");

    expect(qrcode.generate).not.toHaveBeenCalled();
  });

  it("deve renderizar o QR normalmente quando o modo por codigo estiver desativado", () => {
    new WhatsAppProvider();

    const qrCall = onMock.mock.calls.find(call => call[0] === "qr");
    const qrCallback = qrCall![1];

    qrCallback("conteudo-do-qr");

    expect(qrcode.generate).toHaveBeenCalledTimes(1);
    expect(qrcode.generate).toHaveBeenCalledWith("conteudo-do-qr", { small: true });
  });

  it("deve respeitar 60s entre exibicoes de QR", () => {
    new WhatsAppProvider();

    const qrCall = onMock.mock.calls.find(call => call[0] === "qr");
    const qrCallback = qrCall![1];

    qrCallback("qr-1");
    expect(qrcode.generate).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date("2026-04-15T10:00:30.000Z"));
    qrCallback("qr-2");
    expect(qrcode.generate).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date("2026-04-15T10:01:00.000Z"));
    qrCallback("qr-3");
    expect(qrcode.generate).toHaveBeenCalledTimes(2);
    expect(qrcode.generate).toHaveBeenLastCalledWith("qr-3", { small: true });
  });

  it("deve chamar o handler quando receber uma mensagem válida", async () => {
    const provider = new WhatsAppProvider();
    const handler = vi.fn();
    provider.onMessage(handler);

    // Capturando o callback registrado no 'message'
    const messageCall = onMock.mock.calls.find(call => call[0] === "message");
    const messageCallback = messageCall![1];

    const mockMessage = {
      fromMe: false,
      from: "5511999999999@c.us",
      body: "oi",
      reply: vi.fn()
    };

    await messageCallback(mockMessage);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      from: "5511999999999@c.us",
      body: "oi"
    }));
  });

  it("deve ignorar mensagens de status ou grupos", async () => {
    const provider = new WhatsAppProvider();
    const handler = vi.fn();
    provider.onMessage(handler);

    const messageCall = onMock.mock.calls.find(call => call[0] === "message");
    const messageCallback = messageCall![1];

    // Status broadcast
    await messageCallback({ fromMe: false, from: "status@broadcast", body: "oi" });
    // Grupos
    await messageCallback({ fromMe: false, from: "123@g.us", body: "oi" });
    // Próprio bot
    await messageCallback({ fromMe: true, from: "bot@c.us", body: "oi" });

    expect(handler).not.toHaveBeenCalled();
  });
});
