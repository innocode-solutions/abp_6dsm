import { ISessionStore } from "./session-store.interface";
import { UserFlowSession } from "./user-flow-session";

export class InMemorySessionStore implements ISessionStore {
  private sessions = new Map<string, UserFlowSession>();

  async get(userId: string): Promise<UserFlowSession | null> {
    return this.sessions.get(userId) ?? null;
  }

  async save(session: UserFlowSession): Promise<void> {
    this.sessions.set(session.userId, session);
  }

  async clear(userId: string): Promise<void> {
    this.sessions.delete(userId);
  }
}
