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
  "aos",
  "minha",
  "meu"
]);

export class KnowledgeService {
  constructor(private readonly repository: IKnowledgeRepository) {}

  findAnswer(query: string): string | null {
    const terms = this.tokenize(query);

    if (terms.length === 0) {
      return null;
    }

    const hits = this.repository.search(query, 1);
    const top = hits[0];

    if (!top || top.score <= 0) {
      return null;
    }

    return [
      `Encontrei uma orientação no Código de Defesa do Consumidor:`,
      ``,
      `${top.entry.title}`,
      `${top.entry.body}`,
      ``,
      `Se quiser, posso te guiar passo a passo no que fazer no Procon.`
    ].join("\n");
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
