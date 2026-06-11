export interface ConversationContext {
  readonly userId: string;
  readonly lastUserMessage: string;
  readonly updatedAt: Date;
}

export interface IConversationContextStore {
  get(userId: string): Promise<ConversationContext | null>;
  save(context: ConversationContext): Promise<void>;
  clear(userId: string): Promise<void>;
}

export class InMemoryConversationContextStore implements IConversationContextStore {
  private readonly contexts = new Map<string, ConversationContext>();

  async get(userId: string): Promise<ConversationContext | null> {
    return this.contexts.get(userId) ?? null;
  }

  async save(context: ConversationContext): Promise<void> {
    this.contexts.set(context.userId, context);
  }

  async clear(userId: string): Promise<void> {
    this.contexts.delete(userId);
  }
}
