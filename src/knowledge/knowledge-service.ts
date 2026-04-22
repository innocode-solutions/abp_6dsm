import type { ILlmService } from "../rag/llm.interface";
import type { KnowledgeHit } from "./knowledge-entry";
import type { IKnowledgeRepository } from "./knowledge-repository.interface";

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
  constructor(
    private readonly repository: IKnowledgeRepository,
    private readonly llmService?: ILlmService
  ) {}

  async findAnswer(query: string): Promise<string | null> {
    const terms = this.tokenize(query);

    if (terms.length === 0) {
      return null;
    }

    const hits = await this.repository.search(query, 3);
    const top = hits[0];

    if (!top || top.score <= 0) {
      return null;
    }

    if (this.llmService) {
      return this.generateWithLlm(query, hits);
    }

    // Fallback sem LLM: retorna o artigo mais relevante formatado
    return [
      `Encontrei uma orientação no Código de Defesa do Consumidor:`,
      ``,
      `${top.entry.title}`,
      `${top.entry.body}`,
      ``,
      `Se quiser, posso te guiar passo a passo no que fazer no Procon.`
    ].join("\n");
  }

  private async generateWithLlm(query: string, hits: KnowledgeHit[]): Promise<string> {
    const context = hits
      .map((h, i) => `[${i + 1}] ${h.entry.title}\n${h.entry.body}`)
      .join("\n\n");

    const prompt = [
      "Você é o ProconBot Jacareí, assistente jurídico do PROCON de Jacareí.",
      "Use apenas os artigos do Código de Defesa do Consumidor abaixo para responder.",
      "Seja claro, direto e objetivo. Não invente informações além do que está no contexto.",
      "",
      "Artigos recuperados da base de conhecimento:",
      context,
      "",
      `Pergunta do consumidor: "${query}"`,
      "",
      "Responda em português, de forma amigável e acessível ao cidadão comum.",
      "Ao final, indique que o usuário pode buscar atendimento presencial no PROCON se precisar de mais orientações."
    ].join("\n");

    return this.llmService!.generate(prompt);
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
