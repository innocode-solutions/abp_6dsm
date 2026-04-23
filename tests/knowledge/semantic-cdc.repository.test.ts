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

/** Embedding mock: Art. 42 → [1,0]  Art. 49 → [0,1]  outros → [0.5,0.5] */
function makeEmbeddingService(): IEmbeddingService {
  const embedFn = vi.fn(async (text: string): Promise<number[]> => {
    if (text.includes("Art. 42") || text.includes("cobrança")) return [1, 0];
    if (text.includes("Art. 49") || text.includes("arrependimento")) return [0, 1];
    return [0.5, 0.5];
  });

  const embedBatchFn = vi.fn(async (texts: string[]): Promise<number[][]> =>
    Promise.all(texts.map((t) => embedFn(t)))
  );

  return { embed: embedFn, embedBatch: embedBatchFn };
}

/** Cria um cdc-index.json temporário com embeddings já calculados. */
function makeIndexFile(dir: string): string {
  const indexPath = join(dir, "cdc-index.json");
  const index = [
    { id: "cdc-1", title: "Art. 42 - Cobrança indevida", body: "Devolução em dobro.", embedding: [1, 0] },
    { id: "cdc-2", title: "Art. 49 - Direito de arrependimento", body: "7 dias para desistir.", embedding: [0, 1] }
  ];
  writeFileSync(indexPath, JSON.stringify(index));
  return indexPath;
}

describe("SemanticCdcRepository", () => {
  it("deve carregar índice do arquivo JSON sem chamar a API", async () => {
    const dir = mkdtempSync(join(tmpdir(), "semantic-test-"));
    const markdownPath = join(dir, "cdc.md");
    const indexPath = makeIndexFile(dir);
    writeFileSync(markdownPath, SAMPLE_MARKDOWN);

    try {
      const embeddingService = makeEmbeddingService();
      const repository = new SemanticCdcRepository(embeddingService, indexPath, markdownPath);

      await repository.initialize();

      // Não deve ter chamado a API de embedding (carregou do JSON)
      expect(embeddingService.embed).not.toHaveBeenCalled();
      expect(embeddingService.embedBatch).not.toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("deve retornar artigo semanticamente similar à query", async () => {
    const dir = mkdtempSync(join(tmpdir(), "semantic-test-"));
    const markdownPath = join(dir, "cdc.md");
    const indexPath = makeIndexFile(dir);
    writeFileSync(markdownPath, SAMPLE_MARKDOWN);

    try {
      const embeddingService = makeEmbeddingService();
      const repository = new SemanticCdcRepository(embeddingService, indexPath, markdownPath);
      await repository.initialize();

      // Query próxima de Art. 42
      const hits = await repository.search("cobrança indevida", 1);

      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].entry.title).toContain("Art. 42");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("deve usar fallback por keyword se índice não existir", async () => {
    const dir = mkdtempSync(join(tmpdir(), "semantic-test-"));
    const markdownPath = join(dir, "cdc.md");
    writeFileSync(markdownPath, SAMPLE_MARKDOWN);
    const indexPath = join(dir, "nao-existe.json");

    try {
      const embeddingService = makeEmbeddingService();
      const repository = new SemanticCdcRepository(embeddingService, indexPath, markdownPath);
      await repository.initialize(); // índice ausente → warn + fallback

      // Busca por keyword funciona sem API
      const hits = await repository.search("cobrança", 1);
      expect(hits).toBeDefined();
      expect(embeddingService.embed).not.toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("deve chamar embed uma vez para a query (não embedBatch)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "semantic-test-"));
    const markdownPath = join(dir, "cdc.md");
    const indexPath = makeIndexFile(dir);
    writeFileSync(markdownPath, SAMPLE_MARKDOWN);

    try {
      const embeddingService = makeEmbeddingService();
      const repository = new SemanticCdcRepository(embeddingService, indexPath, markdownPath);
      await repository.initialize();

      await repository.search("minha pergunta", 3);

      // search() usa embed() para a query
      expect(embeddingService.embed).toHaveBeenCalledTimes(1);
      expect(embeddingService.embedBatch).not.toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
