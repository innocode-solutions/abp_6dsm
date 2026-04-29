export interface ConversationMessageContext {
  /** ObjectId (string) da raiz de sessão em MongoDB, quando disponível. */
  readonly sessionId?: string;
}

export interface IMessageProcessor {
  processIncomingMessage(
    from: string,
    body: string,
    context?: ConversationMessageContext
  ): Promise<string>;
}
