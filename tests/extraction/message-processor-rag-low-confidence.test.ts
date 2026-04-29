import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageProcessorService } from "../../src/messages/message-processor.service";
import { FlowEngine } from "../../src/engine/flow-engine";
import { InMemorySessionStore } from "../../src/sessions/in-memory-session-store";
import type { IFlowMatcher } from "../../src/flows/flow-matcher.interface";
import { flowRegistry } from "../../src/flows/flow-registry";
import { KnowledgeService } from "../../src/knowledge/knowledge-service";
import type { IKnowledgeRepository } from "../../src/knowledge/knowledge-repository.interface";

/**
 * Quando o orquestrador devolve `match: null` (ex.: score NLP abaixo do threshold),
 * o processador não inicia fluxo e segue para a base de conhecimento (RAG/keyword).
 */
describe("MessageProcessorService — RAG quando não há fluxo (ex.: score NLP insuficiente)", () => {
  const knowledgeRepositoryMock: IKnowledgeRepository = {
    search: vi.fn().mockResolvedValue([
      {
        score: 2,
        entry: {
          id: "cdc-art",
          title: "Direito do consumidor",
          body: "Resposta da base CDC para pergunta jurídica."
        }
      }
    ])
  };

  const knowledgeService = new KnowledgeService(knowledgeRepositoryMock);

  let mockMatcher: IFlowMatcher;

  beforeEach(() => {
    mockMatcher = {
      findByMessage: vi.fn().mockResolvedValue({
        match: null,
        nlpClassification: {
          intent: "cobranca_indevida",
          score: 0.5
        }
      })
    };
  });

  it("com match null, usa KnowledgeService e devolve texto da base (não inicia fluxo)", async () => {
    const processor = new MessageProcessorService(
      new FlowEngine(),
      mockMatcher,
      new InMemorySessionStore(),
      knowledgeService
    );

    const body =
      "preciso saber sobre garantia produto defeito fornecedor empresa registro protocolo texto longo explicativo conteudo";
    const response = await processor.processIncomingMessage("user-rag-low-nlp", body);

    expect(mockMatcher.findByMessage).toHaveBeenCalledWith(body, flowRegistry);
    expect(response).toContain("Código de Defesa do Consumidor");
    expect(response).toContain("Resposta da base CDC");
    expect(response).not.toContain("Você reconhece ou contratou essa cobrança?");
  });
});
