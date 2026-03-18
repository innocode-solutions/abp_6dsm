import { WhatsAppClient } from "./whatsapp/whatsapp-client";

export async function bootstrap(): Promise<void> {
  try {
    const whatsapp = new WhatsAppClient();
    await whatsapp.initialize();

    console.log("Servidor iniciado com integração ao WhatsApp.");
  } catch (error) {
    console.error("Erro ao iniciar aplicação:", error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  bootstrap();
}