import qrcode from "qrcode-terminal";
import { Client, LocalAuth, Message } from "whatsapp-web.js";

export class WhatsAppClient {
  private client: Client;

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

    console.log(`Mensagem recebida de ${message.from}: ${message.body}`);

    await message.reply(
      "Olá! Sou o ProconBot Jacareí. Em breve vou te ajudar com orientações sobre direitos do consumidor."
    );
  }

  async initialize(): Promise<void> {
    await this.client.initialize();
  }

  getClient(): Client {
    return this.client;
  }
}