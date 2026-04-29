import { ConversationSessionRootModel } from "../database/models/conversation-session-root.model";
import type { IConversationSessionIdService } from "./conversation-session-id.interface";

export class MongoConversationSessionIdService implements IConversationSessionIdService {
  async getOrCreateSessionId(userId: string): Promise<string | undefined> {
    try {
      const doc = await ConversationSessionRootModel.findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).exec();
      return doc ? String(doc._id) : undefined;
    } catch {
      return undefined;
    }
  }
}
