import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import mongoose from "mongoose";
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
   * Carrega o índice semântico para o vector store.
   *
   * Prioridade:
   *  1. MongoDB (se conectado e com dados) — permite regenerar o índice no
   *     Railway sem precisar commitar um novo JSON.
   *  2. Arquivo cdc-index.json (fallback) — pré-computado localmente e
   *     commitado no repositório.
   *
   * Nunca faz chamadas à API de embeddings — os vetores já foram gerados
   * pelo script `npm run rag:index`.
   */
  async initialize(): Promise<void> {
    // 1. Tentar MongoDB se a conexão estiver ativa
    if (mongoose.connection.readyState === 1) {
      const loaded = await this.tryLoadFromMongo();
      if (loaded) return;
      console.warn("[RAG] MongoDB conectado mas sem índice — tentando arquivo local.");
    }

    // 2. Fallback: arquivo JSON pré-computado commitado no repositório
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
      `[RAG] Índice carregado do arquivo: ${this.vectorStore.size} artigos prontos` +
      (skipped > 0 ? ` (${skipped} vetados ignorados)` : "") +
      ` — sem chamadas de API.`
    );
  }

  /** Tenta carregar o índice do MongoDB. Retorna true se carregou com sucesso. */
  private async tryLoadFromMongo(): Promise<boolean> {
    try {
      // Import dinâmico evita problemas de registro do modelo em contextos de teste
      const { RagIndexEntryModel } = await import("../database/models/rag-index.model");
      const entries = await RagIndexEntryModel.find({}).lean();

      if (entries.length === 0) return false;

      let skipped = 0;
      for (const e of entries) {
        if (/\(vetado\)/i.test(e.title)) { skipped++; continue; }
        this.vectorStore.add(
          { id: e.entryId, title: e.title, body: e.body },
          e.embedding
        );
      }

      this.ready = true;
      console.log(
        `[RAG] Índice carregado do MongoDB: ${this.vectorStore.size} artigos prontos` +
        (skipped > 0 ? ` (${skipped} vetados ignorados)` : "") + `.`
      );
      return true;
    } catch (err) {
      console.warn("[RAG] Erro ao carregar índice do MongoDB:", err);
      return false;
    }
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
