import { KnowledgeHit } from "./knowledge-entry";

export interface IKnowledgeRepository {
  search(query: string, limit?: number): Promise<KnowledgeHit[]>;
}
