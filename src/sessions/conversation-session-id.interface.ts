/**
 * Fornece um identificador de sessão estável por utilizador do canal (ex.: WhatsApp `from`)
 * para correlacionar extrações persistidas em MongoDB.
 */
export interface IConversationSessionIdService {
  /** Retorna `undefined` se persistência Mongo não estiver disponível ou falhar sem bloquear. */
  getOrCreateSessionId(userId: string): Promise<string | undefined>;
}
