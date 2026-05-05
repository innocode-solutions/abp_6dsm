import { IHistoryRepository } from "./history";
import { IMessageLogService, IncomingMessageLog } from "./message-log.interface";

export class MessageLogService implements IMessageLogService {
  constructor(private repository?: IHistoryRepository) {}

  async logIncomingMessage(message: IncomingMessageLog): Promise<void> {
    console.log("[MESSAGE_LOG] Mensagem recebida:", message);
    if (this.repository) {
      await this.repository.save({
        from: message.from,
        body: message.body,
        direction: "in",
        timestamp: message.timestamp
      });
    }
  }

  async logOutgoingMessage(message: { from: string; body: string; timestamp: string }): Promise<void> {
    console.log("[MESSAGE_LOG] Mensagem enviada:", message);
    if (this.repository) {
      await this.repository.save({
        from: message.from,
        body: message.body,
        direction: "out",
        timestamp: message.timestamp
      });
    }
  }
}