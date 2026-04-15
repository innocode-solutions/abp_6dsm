import { MessageLogService } from "../messages/message-log.service";
import { MessageProcessorService } from "../messages/message-processor.service";
import type { MessagingProvider, IncomingMessage } from "../types/messaging";

export class ProconBot {
  private logService: MessageLogService;
  private processor: MessageProcessorService;

  constructor(private provider: MessagingProvider) {
    this.logService = new MessageLogService();
    this.processor = new MessageProcessorService();
  }

  async start(): Promise<void> {
    await this.provider.initialize();
    
    this.provider.onMessage(async (message: IncomingMessage) => {
      await this.handleIncomingMessage(message);
    });
  }

  private async handleIncomingMessage(message: IncomingMessage): Promise<void> {
    this.logService.logIncomingMessage({
      from: message.from,
      body: message.body,
      timestamp: message.timestamp
    });

    const response = await this.processor.processIncomingMessage(
      message.from,
      message.body
    );

    await message.reply(response);
  }
}
