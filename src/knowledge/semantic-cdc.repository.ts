import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { IEmbeddingService } from "../rag/embedding.interface";
import { VectorStore } from "../rag/vector-store";
import type { KnowledgeEntry, KnowledgeHit } from "./knowledge-entry";
import { MarkdownCdcRepository } from "./markdown-cdc.repository";

type IndexEntry = KnowledgeEntry & { embedding: number[] };

const DEFAULT_INDEX_PATH = resolve(process.cwd(), "src", "knowledge", "cdc-index.json");

export class SemanticCdcRepository extends MarkdownCdcRepository {
  private readonly vectorStore = new VectorStore();
  private ready = false;

  constructor(
    private readonly embeddingService: IEmbeddingService,
    private readonly indexPath = DEFAULT_INDEX_PATH,
    markdownPath = resolve(process.cwd(), "docs", "knowledge", "cdc.md")
  ) {
    super(markdownPath);
  }

  /**
   * Carrega o índice pré-computado (cdc-index.json) para o vector store.
   * Não faz nenhuma chamada de API — os embeddings já foram gerados pelo script rag:index.
   * Artigos vetados são descartados aqui mesmo, independente do que estiver no JSON.
   */
  async initialize(): Promise<void> {
    if (!existsSync(this.indexPath)) {
      console.warn(
        `[RAG] Índice não encontrado em ${this.indexPath}.\n` +
        `      Execute "npm run rag:index" para gerar o índice semântico.\n` +
        `      Usando busca por keyword como fallback.`
      );
      return;
    }

    const raw = readFileSync(this.indexPath, "utf-8");
    const index: IndexEntry[] = JSON.parse(raw);

    let skipped = 0;
    for (const item of index) {
      if (/\(vetado\)/i.test(item.title)) {
        skipped++;
        continue;
      }
      this.vectorStore.add(item, item.embedding);
    }

    this.ready = true;
    console.log(
      `[RAG] Índice carregado: ${this.vectorStore.size} artigos prontos` +
      (skipped > 0 ? ` (${skipped} vetados ignorados)` : "") +
      ` — sem chamadas de API.`
    );
  }

  /**
   * Busca híbrida: combina cosine similarity (70%) com score de keyword (30%).
   * Fallback para busca por keyword se o índice não foi carregado.
   */
  override async search(query: string, limit = 3): Promise<KnowledgeHit[]> {
    if (!this.ready) {
      console.warn("[RAG] Índice semântico não disponível, usando busca por keyword.");
      return super.search(query, limit);
    }

    const queryEmbedding = await this.embeddingService.embed(query);

    // Busca vetorial com threshold mais permissivo para ter candidatos ao reranking
    const vectorHits = this.vectorStore.search(queryEmbedding, limit * 3, 0.50);

    if (vectorHits.length === 0) {
      return super.search(query, limit);
    }

    // Busca por keyword nos mesmos candidatos (hybrid scoring)
    const keywordHits = await super.search(query, limit * 3);
    const keywordScoreMap = new Map(keywordHits.map((h) => [h.entry.id, h.score]));
    const maxKeywordScore = Math.max(...keywordHits.map((h) => h.score), 1);

    // Score híbrido: 70% semântico + 30% keyword
    const hybridHits = vectorHits.map((hit) => {
      const keywordRaw = keywordScoreMap.get(hit.entry.id) ?? 0;
      const keywordNorm = keywordRaw / maxKeywordScore;
      return {
        entry: hit.entry,
        score: 0.7 * hit.score + 0.3 * keywordNorm
      };
    });

    return hybridHits
      .filter((h) => h.score >= 0.42) // threshold sobre score híbrido
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
