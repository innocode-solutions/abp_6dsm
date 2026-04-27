export interface IncomingMessageLog {
  from: string;
  body: string;
  timestamp: string;
}

export class MessageLogService {
  logIncomingMessage(message: IncomingMessageLog): void {
    console.log("[MESSAGE_LOG] Mensagem recebida:", message);
  }
}