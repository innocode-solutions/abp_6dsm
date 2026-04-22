import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";
import { SemanticCdcRepository } from "../../src/knowledge/semantic-cdc.repository";
import type { IEmbeddingService } from "../../src/rag/embedding.interface";

const SAMPLE_MARKDOWN = [
  "# CDC",
  "",
  "## Art. 42 - Cobrança indevida",
  "Consumidor cobrado em quantia indevida tem direito à devolução em dobro.",
  "",
  "## Art. 49 - Direito de arrependimento",
  "Consumidor pode desistir do contrato em até 7 dias."
].join("\n");

/**
 * Cria um embedding mock onde cada artigo tem um vetor único.
 * Art. 42 → [1, 0]   Art. 49 → [0, 1]
 * Query "cobrança" → [0.95, 0.05] (próxima de Art. 42)
 */
function makeEmbeddingService(): IEmbeddingService {
  return {
    embed: vi.fn(async (text: string): Promise<number[]> => {
      if (text.includes("Art. 42") || text.includes("cobrança")) {
        return [1, 0];
      }
      if (text.includes("Art. 49") || text.includes("arrependimento")) {
        return [0, 1];
      }
      return [0.5, 0.5];
    })
  };
}

describe("SemanticCdcRepository", () => {
  it("deve indexar todos os artigos ao inicializar", async () => {
    const dir = mkdtempSync(join(tmpdir(), "semantic-test-"));
    const markdownPath = join(dir, "cdc.md");
    writeFileSync(markdownPath, SAMPLE_MARKDOWN);

    try {
      const embeddingService = makeEmbeddingService();
      const repository = new SemanticCdcRepository(embeddingService, markdownPath);

      await repository.initialize();

      // 2 artigos → 2 chamadas de embed
      expect(embeddingService.embed).toHaveBeenCalledTimes(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("deve retornar artigo semanticamente similar à query", async () => {
    const dir = mkdtempSync(join(tmpdir(), "semantic-test-"));
    const markdownPath = join(dir, "cdc.md");
    writeFileSync(markdownPath, SAMPLE_MARKDOWN);

    try {
      const embeddingService = makeEmbeddingService();
      const repository = new SemanticCdcRepository(embeddingService, markdownPath);
      await repository.initialize();

      const hits = await repository.search("cobrança indevida", 1);

      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].entry.title).toContain("Art. 42");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("deve usar fallback por keyword se não inicializado", async () => {
    const dir = mkdtempSync(join(tmpdir(), "semantic-test-"));
    const markdownPath = join(dir, "cdc.md");
    writeFileSync(markdownPath, SAMPLE_MARKDOWN);

    try {
      const embeddingService = makeEmbeddingService();
      const repository = new SemanticCdcRepository(embeddingService, markdownPath);

      // NÃO chama initialize()
      const hits = await repository.search("cobrança", 1);

      // Deve funcionar via keyword (MarkdownCdcRepository.search)
      expect(hits).toBeDefined();
      expect(embeddingService.embed).not.toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("deve chamar embed uma vez para a query na busca semântica", async () => {
    const dir = mkdtempSync(join(tmpdir(), "semantic-test-"));
    const markdownPath = join(dir, "cdc.md");
    writeFileSync(markdownPath, SAMPLE_MARKDOWN);

    try {
      const embeddingService = makeEmbeddingService();
      const repository = new SemanticCdcRepository(embeddingService, markdownPath);
      await repository.initialize();

      const callsBefore = (embeddingService.embed as ReturnType<typeof vi.fn>).mock.calls.length;
      await repository.search("minha pergunta", 3);
      const callsAfter = (embeddingService.embed as ReturnType<typeof vi.fn>).mock.calls.length;

      // Uma chamada extra: o embedding da query
      expect(callsAfter - callsBefore).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
