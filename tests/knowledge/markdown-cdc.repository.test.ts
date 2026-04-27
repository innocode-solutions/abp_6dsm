import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { MarkdownCdcRepository } from "../../src/knowledge/markdown-cdc.repository";

describe("MarkdownCdcRepository", () => {
  it("deve carregar markdown e retornar artigo mais relevante", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cdc-test-"));
    const markdownPath = join(dir, "cdc.md");

    writeFileSync(
      markdownPath,
      [
        "# CDC",
        "",
        "## Art. 42 - Cobrança indevida",
        "Consumidor pode pedir devolução em dobro.",
        "",
        "## Art. 49 - Direito de arrependimento",
        "Consumidor pode desistir em até 7 dias."
      ].join("\n")
    );

    try {
      const repository = new MarkdownCdcRepository(markdownPath);
      const hits = await repository.search("cobrança indevida", 1);

      expect(hits).toHaveLength(1);
      expect(hits[0].entry.title).toContain("Art. 42");
      expect(hits[0].score).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("deve retornar lista vazia para query sem termos relevantes", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cdc-test-"));
    const markdownPath = join(dir, "cdc.md");

    writeFileSync(markdownPath, ["# CDC", "", "## Art. 1°", "Normas de proteção."].join("\n"));

    try {
      const repository = new MarkdownCdcRepository(markdownPath);
      const hits = await repository.search("a o e de", 3);

      expect(hits).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("deve respeitar o limite de resultados", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cdc-test-"));
    const markdownPath = join(dir, "cdc.md");

    writeFileSync(
      markdownPath,
      [
        "# CDC",
        "",
        "## Art. 1° - consumidor direito",
        "Direito do consumidor protegido.",
        "",
        "## Art. 2° - consumidor fornecedor",
        "Consumidor e fornecedor nas relações.",
        "",
        "## Art. 3° - consumidor serviço",
        "Serviços ao consumidor regulamentados."
      ].join("\n")
    );

    try {
      const repository = new MarkdownCdcRepository(markdownPath);
      const hits = await repository.search("consumidor", 2);

      expect(hits.length).toBeLessThanOrEqual(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
