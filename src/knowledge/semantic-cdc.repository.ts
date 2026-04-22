import { resolve } from "node:path";
import type { IEmbeddingService } from "../rag/embedding.interface";
import { VectorStore } from "../rag/vector-store";
import type { KnowledgeHit } from "./knowledge-entry";
import { MarkdownCdcRepository } from "./markdown-cdc.repository";

export class SemanticCdcRepository extends MarkdownCdcRepository {
  private readonly vectorStore = new VectorStore();
  private ready = false;

  constructor(
    private readonly embeddingService: IEmbeddingService,
    markdownPath = resolve(process.cwd(), "docs", "knowledge", "cdc.md")
  ) {
    super(markdownPath);
  }

  /**
   * Gera embeddings para todos os artigos do CDC e popula o vector store.
   * Deve ser chamado uma vez na inicialização do servidor.
   */
  async initialize(): Promise<void> {
    console.log(`[RAG] Indexando ${this.entries.length} artigos do CDC...`);

    for (const entry of this.entries) {
      const text = `${entry.title} ${entry.body}`;
      const embedding = await this.embeddingService.embed(text);
      this.vectorStore.add(entry, embedding);
    }

    this.ready = true;
    console.log(`[RAG] Indexação concluída. ${this.vectorStore.size} artigos indexados.`);
  }

  /**
   * Busca artigos semanticamente relacionados à query via cosine similarity.
   * Fallback para busca por keyword se o repositório não foi inicializado.
   */
  override async search(query: string, limit = 3): Promise<KnowledgeHit[]> {
    if (!this.ready) {
      console.warn("[RAG] Repositório semântico não inicializado, usando busca por keyword.");
      return super.search(query, limit);
    }

    const queryEmbedding = await this.embeddingService.embed(query);
    return this.vectorStore.search(queryEmbedding, limit);
  }
}
