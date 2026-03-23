export interface IncomingMessage {
  from: string;
  body: string;
  timestamp: string;
  reply(text: string): Promise<void>;
}

export interface MessagingProvider {
  initialize(): Promise<void>;
  onMessage(handler: (message: IncomingMessage) => Promise<void>): void;
}
