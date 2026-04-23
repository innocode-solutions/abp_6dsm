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

    for (const item of index) {
      this.vectorStore.add(item, item.embedding);
    }

    this.ready = true;
    console.log(`[RAG] Índice carregado: ${this.vectorStore.size} artigos prontos (sem chamadas de API).`);
  }

  /**
   * Busca artigos semanticamente relacionados à query via cosine similarity.
   * Fallback para busca por keyword se o índice não foi carregado.
   */
  override async search(query: string, limit = 3): Promise<KnowledgeHit[]> {
    if (!this.ready) {
      console.warn("[RAG] Índice semântico não disponível, usando busca por keyword.");
      return super.search(query, limit);
    }

    const queryEmbedding = await this.embeddingService.embed(query);
    // minScore 0.60: filtra artigos não relacionados mas aceita perguntas específicas sobre direitos
    return this.vectorStore.search(queryEmbedding, limit, 0.60);
  }
}
