import type { KnowledgeEntry, KnowledgeHit } from "../knowledge/knowledge-entry";

interface VectorEntry {
  entry: KnowledgeEntry;
  embedding: number[];
}

export class VectorStore {
  private readonly items: VectorEntry[] = [];

  add(entry: KnowledgeEntry, embedding: number[]): void {
    this.items.push({ entry, embedding });
  }

  search(queryEmbedding: number[], topK: number, minScore = 0.5): KnowledgeHit[] {
    return this.items
      .map((item) => ({
        entry: item.entry,
        score: this.cosineSimilarity(queryEmbedding, item.embedding)
      }))
      .filter((hit) => hit.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  get size(): number {
    return this.items.length;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
