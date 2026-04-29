import { IMessageLogService } from "../messages/message-log.interface";
import { IMessageProcessor } from "../messages/message-processor.interface";
import type { IConversationSessionIdService } from "../sessions/conversation-session-id.interface";
import type { MessagingProvider, IncomingMessage } from "../types/messaging";

export class ProconBot {
  constructor(
    private provider: MessagingProvider,
    private processor: IMessageProcessor,
    private logService: IMessageLogService,
    private conversationSessionIdService?: IConversationSessionIdService
  ) {}

  async start(): Promise<void> {
    await this.provider.initialize();

    this.provider.onMessage(async (message: IncomingMessage) => {
      await this.handleIncomingMessage(message);
    });
  }

  private async handleIncomingMessage(message: IncomingMessage): Promise<void> {
    await this.logService.logIncomingMessage({
      from: message.from,
      body: message.body,
      timestamp: message.timestamp
    });

    const sessionId = await this.conversationSessionIdService?.getOrCreateSessionId(
      message.from
    );

    const response =
      sessionId !== undefined && sessionId !== ""
        ? await this.processor.processIncomingMessage(message.from, message.body, {
            sessionId
          })
        : await this.processor.processIncomingMessage(message.from, message.body);

    await this.logService.logOutgoingMessage({
      from: message.from,
      body: response,
      timestamp: new Date().toISOString()
    });

    await message.reply(response);
  }
}
