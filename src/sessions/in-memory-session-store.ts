import type { FlowSession } from "../types/flow";
import { ISessionStore } from "./session-store.interface";

export interface UserFlowSession {
  userId: string;
  flowId: string;
  flowSession: FlowSession;
}

export class InMemorySessionStore implements ISessionStore {
  private sessions = new Map<string, UserFlowSession>();

  get(userId: string): UserFlowSession | null {
    return this.sessions.get(userId) ?? null;
  }

  save(session: UserFlowSession): void {
    this.sessions.set(session.userId, session);
  }

  clear(userId: string): void {
    this.sessions.delete(userId);
  }
}