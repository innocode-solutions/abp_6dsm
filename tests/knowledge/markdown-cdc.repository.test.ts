import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { MarkdownCdcRepository } from "../../src/knowledge/markdown-cdc.repository";

describe("MarkdownCdcRepository", () => {
  it("deve carregar markdown e retornar artigo mais relevante", () => {
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
      const hits = repository.search("cobrança indevida", 1);

      expect(hits).toHaveLength(1);
      expect(hits[0].entry.title).toContain("Art. 42");
      expect(hits[0].score).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});