import qrcode from "qrcode-terminal";
import { Client, LocalAuth, Message } from "whatsapp-web.js";
import { MessageLogService } from "../messages/message-log.service";
import { MessageProcessorService } from "../messages/message-processor.service";

export class WhatsAppClient {
  private client: Client;
  private messageLogService: MessageLogService;
  private messageProcessorService: MessageProcessorService;

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

    this.messageLogService = new MessageLogService();
    this.messageProcessorService = new MessageProcessorService();

    this.registerEvents();
  }

  private registerEvents(): void {
    this.client.on("qr", (qr: string) => {
      console.log("QR Code recebido. Escaneie com o WhatsApp:");
      qrcode.generate(qr, { small: true });
    });

    this.client.on("authenticated", () => {
      console.log("WhatsApp autenticado com sucesso.");
    });

    this.client.on("ready", () => {
      console.log("WhatsApp conectado e pronto para uso.");
    });

    this.client.on("auth_failure", (message: string) => {
      console.error("Falha na autenticação do WhatsApp:", message);
    });

    this.client.on("disconnected", (reason: string) => {
      console.warn("WhatsApp desconectado:", reason);
    });

    this.client.on("message", async (message: Message) => {
      await this.handleIncomingMessage(message);
    });
  }

  async handleIncomingMessage(message: Message): Promise<void> {
    if (message.fromMe) return;
    if (message.from === "status@broadcast") return;
    if (message.from.endsWith("@g.us")) return;

    this.messageLogService.logIncomingMessage({
      from: message.from,
      body: message.body,
      timestamp: new Date().toISOString()
    });

    const response = await this.messageProcessorService.processIncomingMessage(
      message.from,
      message.body
    );

    await message.reply(response);
  }

  async initialize(): Promise<void> {
    await this.client.initialize();
  }

  getClient(): Client {
    return this.client;
  }
}