import { IHistoryRepository } from "../../messages/history";
import { IEntityExtractionRepository } from "../../extraction/entity-extraction-repository.interface";

export interface DashboardResult {
  totalMessages: number;
  totalByUser: { userId: string; count: number }[];
  totalExtractions: number;
  lastUpdated: Date;
}

/**
 * Caso de uso: agrega métricas de atendimento a partir dos repositórios
 * existentes sem depender de nenhuma implementação concreta (Mongo, in-memory, etc.).
 */
export class GetDashboardUseCase {
  constructor(
    private readonly historyRepository: IHistoryRepository,
    private readonly entityRepository?: IEntityExtractionRepository
  ) {}

  async execute(userIds: string[]): Promise<DashboardResult> {
    const userStats = await Promise.all(
      userIds.map(async (userId) => {
        const messages = await this.historyRepository.findByUser(userId);
        return { userId, count: messages.length };
      })
    );

    const totalMessages = userStats.reduce((acc, s) => acc + s.count, 0);

    return {
      totalMessages,
      totalByUser: userStats,
      // entityRepository ainda não expõe um método de contagem global;
      // será expandido quando IEntityExtractionRepository evoluir.
      totalExtractions: 0,
      lastUpdated: new Date()
    };
  }
}
