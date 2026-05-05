import { ChatSessionModel } from "../database/models/chat-session.model";
import { ISessionStore } from "./session-store.interface";
import { UserFlowSession } from "./user-flow-session";

type ChatSessionDocument = {
  userId: string;
  flowId: string;
  flowSession: UserFlowSession["flowSession"];
};

export class MongoSessionStore implements ISessionStore {
  async get(userId: string): Promise<UserFlowSession | null> {
    const session = await ChatSessionModel.findOne({ userId }).lean<ChatSessionDocument | null>();

    if (!session) {
      return null;
    }

    return this.toDomain(session);
  }

  async save(session: UserFlowSession): Promise<void> {
    await ChatSessionModel.findOneAndUpdate(
      { userId: session.userId },
      {
        userId: session.userId,
        flowId: session.flowId,
        flowSession: session.flowSession
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );
  }

  async clear(userId: string): Promise<void> {
    await ChatSessionModel.deleteOne({ userId });
  }

  private toDomain(session: ChatSessionDocument): UserFlowSession {
    return {
      userId: session.userId,
      flowId: session.flowId,
      flowSession: session.flowSession
    };
  }
}
