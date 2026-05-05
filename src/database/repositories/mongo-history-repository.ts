import { ChatMessageModel } from "../models/chat-message.model";
import { ChatMessage, IHistoryRepository } from "../../messages/history";

export class MongoHistoryRepository implements IHistoryRepository {
  async save(message: ChatMessage): Promise<void> {
    await ChatMessageModel.create({
      from: message.from,
      direction: message.direction,
      body: message.body,
      clientTimestamp: message.timestamp
    });
  }

  async findByUser(userId: string): Promise<ChatMessage[]> {
    const records = await ChatMessageModel.find({ from: userId })
      .sort({ createdAt: 1 })
      .exec();

    return records.map((record: any) => ({
      from: record.from,
      direction: record.direction as "in" | "out",
      body: record.body,
      timestamp: record.clientTimestamp
    }));
  }
}
