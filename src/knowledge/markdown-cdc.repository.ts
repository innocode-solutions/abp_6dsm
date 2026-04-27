import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { KnowledgeEntry, KnowledgeHit } from "./knowledge-entry";
import { IKnowledgeRepository } from "./knowledge-repository.interface";

const STOPWORDS = new Set([
  "a",
  "o",
  "os",
  "as",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "ou",
  "para",
  "por",
  "com",
  "que",
  "um",
  "uma",
  "no",
  "na",
  "nos",
  "nas",
  "em",
  "se",
  "ao",
  "aos"
]);

export class MarkdownCdcRepository implements IKnowledgeRepository {
  protected readonly entries: KnowledgeEntry[];

  constructor(markdownPath = resolve(process.cwd(), "docs", "knowledge", "cdc.md")) {
    const markdown = readFileSync(markdownPath, "utf-8");
    this.entries = this.parseEntries(markdown);
  }

  async search(query: string, limit = 3): Promise<KnowledgeHit[]> {
    const terms = this.tokenize(query);

    if (terms.length === 0) {
      return [];
    }

    return this.entries
      .map((entry) => ({
        entry,
        score: this.calculateScore(entry, terms)
      }))
      .filter((hit) => hit.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private calculateScore(entry: KnowledgeEntry, terms: string[]): number {
    const haystack = `${entry.title} ${entry.body}`.toLowerCase();
    let score = 0;

    for (const term of terms) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "g");
      const matches = haystack.match(regex);
      score += matches ? matches.length : 0;
    }

    return score;
  }

  protected parseEntries(markdown: string): KnowledgeEntry[] {
    const lines = markdown.split(/\r?\n/);
    const entries: KnowledgeEntry[] = [];
    let currentTitle = "";
    let currentBody: string[] = [];

    const flush = (): void => {
      if (!currentTitle || currentBody.length === 0) {
        return;
      }

      // Ignorar artigos vetados — sem conteúdo útil
      if (this.isVetado(currentTitle)) {
        return;
      }

      const cleanedBody = this.cleanBody(currentBody).join("\n").trim();

      // Ignorar entradas cujo corpo seja vazio ou apenas headings estruturais
      if (!cleanedBody) {
        return;
      }

      entries.push({
        id: `cdc-${entries.length + 1}`,
        title: currentTitle.trim(),
        body: cleanedBody
      });
    };

    for (const line of lines) {
      if (line.startsWith("## ")) {
        flush();
        currentTitle = line.replace("## ", "");
        currentBody = [];
        continue;
      }

      if (!currentTitle) {
        continue;
      }

      if (line.trim().length === 0 && currentBody[currentBody.length - 1] === "") {
        continue;
      }

      currentBody.push(line.trim());
    }

    flush();
    return entries;
  }

  /** Artigo vetado → sem conteúdo normativo útil. */
  private isVetado(title: string): boolean {
    return /\(vetado\)/i.test(title);
  }

  /**
   * Remove linhas que são puramente headers estruturais da lei
   * (CAPÍTULO, SEÇÃO, TÍTULO, LIVRO) que acabam no corpo de um artigo
   * por estarem contíguas no markdown.
   */
  private cleanBody(lines: string[]): string[] {
    const STRUCTURAL = /^(CAPÍTULO|SEÇÃO|TÍTULO|LIVRO|PARTE)\s+/i;
    return lines.filter((line) => !STRUCTURAL.test(line.trim()));
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((part) => part.length >= 3 && !STOPWORDS.has(part));
  }
}
