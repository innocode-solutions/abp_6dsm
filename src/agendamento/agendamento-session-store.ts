import type { AgendamentoConversationSession } from "./agendamento.types";

export interface IAgendamentoSessionStore {
  get(userId: string): Promise<AgendamentoConversationSession | null>;
  save(session: AgendamentoConversationSession): Promise<void>;
  clear(userId: string): Promise<void>;
}

export class InMemoryAgendamentoSessionStore implements IAgendamentoSessionStore {
  private readonly sessions = new Map<string, AgendamentoConversationSession>();

  async get(userId: string): Promise<AgendamentoConversationSession | null> {
    return this.sessions.get(userId) ?? null;
  }

  async save(session: AgendamentoConversationSession): Promise<void> {
    this.sessions.set(session.userId, session);
  }

  async clear(userId: string): Promise<void> {
    this.sessions.delete(userId);
  }
}
