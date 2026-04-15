import { UserFlowSession } from "./in-memory-session-store";

export interface ISessionStore {
  get(userId: string): UserFlowSession | null;
  save(session: UserFlowSession): void;
  clear(userId: string): void;
}
