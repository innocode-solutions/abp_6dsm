import { UserFlowSession } from "./user-flow-session";

export interface ISessionStore {
  get(userId: string): Promise<UserFlowSession | null>;
  save(session: UserFlowSession): Promise<void>;
  clear(userId: string): Promise<void>;
}
