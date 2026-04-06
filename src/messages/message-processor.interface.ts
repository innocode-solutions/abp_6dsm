export interface IMessageProcessor {
  processIncomingMessage(from: string, body: string): Promise<string>;
}
