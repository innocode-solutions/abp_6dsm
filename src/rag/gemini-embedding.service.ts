import type { IEmbeddingService } from "./embedding.interface";

const EMBEDDING_MODEL = "gemini-embedding-001";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Máximo seguro por lote — fica abaixo do limite de 100 req/min do free tier
const BATCH_SIZE = 90;

type ApiError = { error?: { message?: string } };

export class GeminiEmbeddingService implements IEmbeddingService {
  constructor(private readonly apiKey: string) {}

  /** Embedding de um único texto (usado em tempo de query). */
  async embed(text: string): Promise<number[]> {
    const url = `${API_BASE}/${EMBEDDING_MODEL}:embedContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] }
      })
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as ApiError;
      throw new Error(
        `[GeminiEmbedding] ${response.status} ${response.statusText}: ${
          error.error?.message ?? "unknown error"
        }`
      );
    }

    const data = (await response.json()) as { embedding: { values: number[] } };
    return data.embedding.values;
  }

  /**
   * Embedding em lote usando batchEmbedContents.
   * Divide em lotes de BATCH_SIZE para respeitar o rate limit do free tier.
   * Uma chamada batchEmbedContents conta como 1 request (não N).
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const chunk = texts.slice(i, i + BATCH_SIZE);
      const embeddings = await this.sendBatch(chunk);
      results.push(...embeddings);
    }

    return results;
  }

  private async sendBatch(texts: string[]): Promise<number[][]> {
    const url = `${API_BASE}/${EMBEDDING_MODEL}:batchEmbedContents?key=${this.apiKey}`;

    const requests = texts.map((text) => ({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] }
    }));

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests })
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as ApiError;
      throw new Error(
        `[GeminiEmbedding] batch ${response.status} ${response.statusText}: ${
          error.error?.message ?? "unknown error"
        }`
      );
    }

    const data = (await response.json()) as { embeddings: Array<{ values: number[] }> };
    return data.embeddings.map((e) => e.values);
  }
}
