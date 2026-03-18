import type { FlowSession } from "../types/flow";

export interface UserFlowSession {
  userId: string;
  flowId: string;
  flowSession: FlowSession;
}

export class InMemorySessionStore {
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