import qrcode from "qrcode-terminal";
import { Client, LocalAuth, Message } from "whatsapp-web.js";
import { IncomingMessage, MessagingProvider } from "../types/messaging";

export class WhatsAppProvider implements MessagingProvider {
  private client: Client;
  private onMessageHandler: ((message: IncomingMessage) => Promise<void>) | null = null;

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: "proconbot-jacarei"
      }),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
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
      console.log("QR Code recebido. Escaneie com o WhatsApp:");
      qrcode.generate(qr, { small: true });
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
}
