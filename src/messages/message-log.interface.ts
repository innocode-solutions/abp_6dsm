export interface IncomingMessageLog {
  from: string;
  body: string;
  timestamp: string;
}

export interface IMessageLogService {
  logIncomingMessage(message: IncomingMessageLog): Promise<void>;
  logOutgoingMessage(message: {
    from: string;
    body: string;
    timestamp: string;
  }): Promise<void>;
}
