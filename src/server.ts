import "dotenv/config";

import { ProconBot } from "./bot/bot";
import { connectMongo, isMongoConfigured } from "./database/connection";
import { WhatsAppProvider } from "./whatsapp/whatsapp-provider";

export async function bootstrap(): Promise<void> {
  try {
    if (process.env.NODE_ENV !== "test" && isMongoConfigured()) {
      await connectMongo();
    } else if (process.env.NODE_ENV !== "test" && !isMongoConfigured()) {
      console.warn(
        "MONGODB_URI não definido: persistência em MongoDB desabilitada. Defina a variável para ativar."
      );
    }

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