export interface ChatMessage {
  from: string;
  body: string;
  direction: "in" | "out";
  /** Timestamp original do cliente ou sistema. */
  timestamp: string;
}

export interface IHistoryRepository {
  save(message: ChatMessage): Promise<void>;
  findByUser(userId: string): Promise<ChatMessage[]>;
}
