import { beforeEach, describe, expect, it, vi } from "vitest";
import { WhatsAppProvider } from "../../src/whatsapp/whatsapp-provider";
import qrcode from "qrcode-terminal";

const onMock = vi.fn();
const initializeMock = vi.fn();
const clientMock = vi.fn();
const localAuthMock = vi.fn();
const remoteAuthMock = vi.fn();

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

  class MockRemoteAuth {
    constructor(...args: unknown[]) {
      remoteAuthMock(...args);
    }
  }

  return {
    Client: MockClient,
    LocalAuth: MockLocalAuth,
    RemoteAuth: MockRemoteAuth
  };
});

describe("WhatsAppProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.WHATSAPP_AUTH_CLIENT_ID;
    delete process.env.WHATSAPP_PHONE_NUMBER;
    delete process.env.WHATSAPP_PAIRING_FALLBACK_QR;
    delete process.env.WHATSAPP_PAIRING_MAX_ATTEMPTS;
    delete process.env.WHATSAPP_PAIRING_SHOW_NOTIFICATION;
    delete process.env.WHATSAPP_USER_AGENT;
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

  it("deve permitir sobrescrever clientId da sessao por variavel de ambiente", () => {
    process.env.WHATSAPP_AUTH_CLIENT_ID = "proconbot-jacarei-v2";

    new WhatsAppProvider();

    expect(localAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: "proconbot-jacarei-v2"
      })
    );
  });

  it("deve habilitar pareamento por codigo quando houver numero configurado", () => {
    process.env.WHATSAPP_PHONE_NUMBER = "+55 (11) 99999-9999";

    new WhatsAppProvider();

    expect(clientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pairWithPhoneNumber: {
          phoneNumber: "5511999999999",
          showNotification: false,
          intervalMs: 180000
        }
      })
    );
  });

  it("deve permitir ativar notificacao de pareamento por variavel de ambiente", () => {
    process.env.WHATSAPP_PHONE_NUMBER = "+55 (11) 99999-9999";
    process.env.WHATSAPP_PAIRING_SHOW_NOTIFICATION = "true";

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

  it("deve usar user-agent moderno por padrao", () => {
    new WhatsAppProvider();

    expect(clientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userAgent: expect.stringContaining("Chrome/139.0.0.0")
      })
    );
  });

  it("deve permitir sobrescrever user-agent por variavel de ambiente", () => {
    process.env.WHATSAPP_USER_AGENT = "Custom WhatsApp Browser";

    new WhatsAppProvider();

    expect(clientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userAgent: "Custom WhatsApp Browser"
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

  it("deve respeitar 180s entre exibicoes de QR", () => {
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
    expect(qrcode.generate).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date("2026-04-15T10:03:00.000Z"));
    qrCallback("qr-4");
    expect(qrcode.generate).toHaveBeenCalledTimes(2);
    expect(qrcode.generate).toHaveBeenLastCalledWith("qr-4", { small: true });
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

  it("deve ignorar mensagem duplicada pelo mesmo id", async () => {
    const provider = new WhatsAppProvider();
    const handler = vi.fn();
    provider.onMessage(handler);

    const messageCall = onMock.mock.calls.find(call => call[0] === "message");
    const messageCallback = messageCall![1];

    const mockMessage = {
      id: { _serialized: "msg-duplicada-1" },
      fromMe: false,
      from: "5511999999999@c.us",
      body: "oi",
      reply: vi.fn()
    };

    await messageCallback(mockMessage);
    await messageCallback(mockMessage);

    expect(handler).toHaveBeenCalledTimes(1);
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
