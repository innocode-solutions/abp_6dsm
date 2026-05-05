import type { ILlmService } from "../rag/llm.interface";
import type { KnowledgeHit } from "./knowledge-entry";
import type { IKnowledgeRepository } from "./knowledge-repository.interface";

const STOPWORDS = new Set([
  "a", "o", "os", "as", "de", "da", "do", "das", "dos", "e", "ou",
  "para", "por", "com", "que", "um", "uma", "no", "na", "nos", "nas",
  "em", "se", "ao", "aos", "minha", "meu", "meus", "minhas", "seu",
  "seus", "sua", "suas", "este", "esta", "isso", "isto", "aqui"
]);

/**
 * Termos de domínio do direito do consumidor (normalizados, sem acentos).
 * Usados para detectar intenção antes de acionar o RAG.
 */
const CONSUMER_TERMS = new Set([
  // Lei e direito
  "direito", "direitos", "lei", "codigo", "cdc", "artigo", "art",
  "procon", "consumidor", "fornecedor", "contrato", "clausula",
  // Produto e serviço
  "produto", "produtos", "servico", "servicos", "garantia", "defeito",
  "vicio", "recall", "qualidade", "item",
  // Cobranças e pagamentos
  "cobranca", "cobrado", "cobrar", "indevida", "indevido",
  "devolucao", "devolver", "reembolso", "reembolsar",
  "indenizacao", "indenizar", "dano", "danos", "prejuizo",
  "pagamento", "paguei", "pagar", "preco", "custo", "valor",
  "nota", "fiscal", "boleto", "parcela", "taxa",
  // Cancelamento e rescisão
  "cancelar", "cancelamento", "desistir", "desistencia", "arrependimento",
  "rescisao", "rescindir",
  // Compra e comércio
  "compra", "comprei", "comprar", "venda", "vender",
  "troca", "trocar", "reparo", "reparar", "conserto",
  // Entrega e prazo
  "entrega", "entregue", "entregar", "atraso", "prazo",
  // Reclamação
  "reclamar", "reclamacao", "registrar", "protocolo", "denuncia",
  // Documentos
  "documento", "documentos", "levar",
]);

export class KnowledgeService {
  constructor(
    private readonly repository: IKnowledgeRepository,
    private readonly llmService?: ILlmService
  ) {}

  async findAnswer(query: string): Promise<string | null> {
    const trimmed = query.trim();
    const tokens = this.tokenize(trimmed);

    if (!this.isConsumerQuery(trimmed, tokens)) {
      return null;
    }

    const hits = await this.repository.search(trimmed, 3);
    const top = hits[0];

    if (!top || top.score <= 0) {
      return null;
    }

    if (this.llmService) {
      try {
        return await this.generateWithLlm(trimmed, hits);
      } catch (error) {
        console.warn("[RAG] Falha ao gerar resposta com LLM. Usando fallback por artigo.", error);
      }
    }

    return this.formatTopHit(top);
  }

  /**
   * Determina se a query tem intenção de consulta sobre direito do consumidor.
   *
   * Regras:
   * - Queries muito curtas (< 10 chars) → não (greetings, "oi", "olá", "ok")
   * - Queries curtas (< 20 chars) → só se contiver ao menos 1 termo do domínio
   * - Queries longas (≥ 20 chars) → sim, desde que tenham ≥ 2 tokens
   */
  private isConsumerQuery(query: string, tokens: string[]): boolean {
    if (query.length < 10) return false;
    if (query.length < 20) {
      return tokens.some((t) => CONSUMER_TERMS.has(t));
    }
    return tokens.length >= 2;
  }

  private async generateWithLlm(query: string, hits: KnowledgeHit[]): Promise<string> {
    const context = hits
      .map((h, i) => `[${i + 1}] ${h.entry.title}\n${h.entry.body}`)
      .join("\n\n");

    const prompt = [
      "Você é o ProconBot Jacareí, assistente jurídico do PROCON de Jacareí.",
      "Responda EXCLUSIVAMENTE com base nos artigos do CDC abaixo.",
      "NUNCA invente artigos, datas, valores ou direitos que não estejam no contexto fornecido.",
      "Se os artigos não forem suficientes para responder, diga claramente que não encontrou informação específica.",
      "Seja claro, direto e acessível ao cidadão comum.",
      "",
      "=== Artigos do Código de Defesa do Consumidor recuperados ===",
      context,
      "=== Fim dos artigos ===",
      "",
      `Pergunta do consumidor: "${query}"`,
      "",
      "Resposta (em português, amigável, baseada apenas no contexto acima):",
      "Ao final, lembre o usuário que pode buscar atendimento presencial no PROCON de Jacareí."
    ].join("\n");

    return this.llmService!.generate(prompt);
  }

  private formatTopHit(top: KnowledgeHit): string {
    return [
      "Encontrei uma orientação no Código de Defesa do Consumidor:",
      "",
      top.entry.title,
      top.entry.body,
      "",
      "Se quiser, posso te guiar passo a passo no que fazer no Procon."
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
