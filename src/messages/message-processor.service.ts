export class MessageProcessorService {
  async processIncomingMessage(from: string, body: string): Promise<string> {
    console.log(`[MESSAGE_PROCESSOR] Processando mensagem de ${from}: ${body}`);

    return "Olá! Recebi sua mensagem e vou te ajudar com orientações do PROCON.";
  }
}