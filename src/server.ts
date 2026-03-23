import { ProconBot } from "./bot/bot";
import { WhatsAppProvider } from "./whatsapp/whatsapp-provider";

export async function bootstrap(): Promise<void> {
  try {
    const provider = new WhatsAppProvider();
    const bot = new ProconBot(provider);

    await bot.start();

    console.log("Servidor iniciado com arquitetura de provedores.");
  } catch (error) {
    console.error("Erro ao iniciar aplicação:", error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  bootstrap();
}