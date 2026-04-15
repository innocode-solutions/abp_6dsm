import qrcode from "qrcode-terminal";
import { Client, LocalAuth, Message } from "whatsapp-web.js";
import { IncomingMessage, MessagingProvider } from "../types/messaging";

export class WhatsAppProvider implements MessagingProvider {
  private client: Client;
  private onMessageHandler: ((message: IncomingMessage) => Promise<void>) | null = null;
  private readonly pairingPhoneNumber: string | null;

  constructor() {
    const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
    this.pairingPhoneNumber = this.normalizePhoneNumber(
      process.env.WHATSAPP_PHONE_NUMBER
    );

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: "proconbot-jacarei"
      }),
      ...(this.pairingPhoneNumber
        ? {
            pairWithPhoneNumber: {
              phoneNumber: this.pairingPhoneNumber,
              showNotification: true,
              intervalMs: 180000
            }
          }
        : {}),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        ...(chromePath ? { executablePath: chromePath } : {})
      }
    });

    this.registerEvents();
  }

  async initialize(): Promise<void> {
    await this.client.initialize();
  }

  onMessage(handler: (message: IncomingMessage) => Promise<void>): void {
    this.onMessageHandler = handler;
  }

  private registerEvents(): void {
    this.client.on("qr", (qr: string) => {
      if (this.pairingPhoneNumber) {
        console.log(
          "[WhatsApp] QR recebido, mas o pareamento por codigo esta ativo. Aguarde o codigo de 8 caracteres no log."
        );
        return;
      }

      console.log("QR Code recebido. Escaneie com o WhatsApp:");
      qrcode.generate(qr, { small: true });
    });

    this.client.on("code", (code: string) => {
      console.log(
        `[WhatsApp] Codigo de pareamento recebido para ${this.maskPhoneNumber(
          this.pairingPhoneNumber
        )}: ${code}`
      );
      console.log(
        "[WhatsApp] No celular, abra WhatsApp > Dispositivos conectados > Conectar um dispositivo > Conectar com numero de telefone."
      );
    });

    this.client.on("authenticated", () => {
      console.log("[WhatsApp] Autenticado com sucesso.");
    });

    this.client.on("ready", () => {
      console.log("[WhatsApp] Conectado e pronto para uso.");
    });

    this.client.on("auth_failure", (message: string) => {
      console.error("[WhatsApp] Falha na autenticação:", message);
    });

    this.client.on("disconnected", (reason: string) => {
      console.warn("[WhatsApp] Desconectado:", reason);
    });

    this.client.on("message", async (message: Message) => {
      if (this.shouldIgnore(message)) return;

      if (this.onMessageHandler) {
        await this.onMessageHandler({
          from: message.from,
          body: message.body,
          timestamp: new Date().toISOString(),
          reply: async (text: string) => {
            await message.reply(text);
          }
        });
      }
    });
  }

  private shouldIgnore(message: Message): boolean {
    return (
      message.fromMe || 
      message.from === "status@broadcast" || 
      message.from.endsWith("@g.us")
    );
  }

  private normalizePhoneNumber(phoneNumber?: string): string | null {
    const sanitized = phoneNumber?.replace(/\D/g, "") ?? "";
    return sanitized.length > 0 ? sanitized : null;
  }

  private maskPhoneNumber(phoneNumber: string | null): string {
    if (!phoneNumber) {
      return "numero configurado";
    }

    if (phoneNumber.length <= 4) {
      return phoneNumber;
    }

    return `${phoneNumber.slice(0, 4)}***${phoneNumber.slice(-2)}`;
  }
}
