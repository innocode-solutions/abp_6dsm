import { describe, expect, it } from "vitest";
import { KnowledgeService } from "../../src/knowledge/knowledge-service";
import type { IKnowledgeRepository } from "../../src/knowledge/knowledge-repository.interface";

describe("KnowledgeService", () => {
  it("deve retornar null quando não houver resultado", async () => {
    const repository: IKnowledgeRepository = {
      search: async () => []
    };
    const service = new KnowledgeService(repository);

    const response = await service.findAnswer("oi");
    expect(response).toBeNull();
  });

  it("deve retornar null quando score for zero", async () => {
    const repository: IKnowledgeRepository = {
      search: async () => [
        {
          score: 0,
          entry: { id: "cdc-1", title: "Art. 1°", body: "Normas de proteção ao consumidor." }
        }
      ]
    };
    const service = new KnowledgeService(repository);

    const response = await service.findAnswer("alguma pergunta");
    expect(response).toBeNull();
  });

  it("deve montar resposta formatada com artigo encontrado (sem LLM)", async () => {
    const repository: IKnowledgeRepository = {
      search: async () => [
        {
          score: 3,
          entry: {
            id: "cdc-49",
            title: "Art. 49 - Direito de arrependimento",
            body: "Consumidor pode desistir da compra em 7 dias."
          }
        }
      ]
    };
    const service = new KnowledgeService(repository);

    const response = await service.findAnswer("comprei na internet e quero cancelar");

    expect(response).not.toBeNull();
    expect(response).toContain("Código de Defesa do Consumidor");
    expect(response).toContain("Art. 49");
  });

  it("deve usar LLM para gerar resposta quando llmService for fornecido", async () => {
    const repository: IKnowledgeRepository = {
      search: async () => [
        {
          score: 0.9,
          entry: {
            id: "cdc-49",
            title: "Art. 49 - Direito de arrependimento",
            body: "Consumidor pode desistir da compra em 7 dias."
          }
        }
      ]
    };

    const llmService = {
      generate: async (_prompt: string) =>
        "Você tem direito de desistir da compra em até 7 dias. Procure o PROCON se precisar."
    };

    const service = new KnowledgeService(repository, llmService);
    const response = await service.findAnswer("posso cancelar minha compra?");

    expect(response).toContain("7 dias");
    expect(response).toContain("PROCON");
  });

  it("deve passar os artigos recuperados no prompt do LLM", async () => {
    let capturedPrompt = "";

    const repository: IKnowledgeRepository = {
      search: async () => [
        {
          score: 0.85,
          entry: { id: "cdc-42", title: "Art. 42 - Cobrança indevida", body: "Devolução em dobro." }
        }
      ]
    };

    const llmService = {
      generate: async (prompt: string) => {
        capturedPrompt = prompt;
        return "Resposta gerada.";
      }
    };

    const service = new KnowledgeService(repository, llmService);
    await service.findAnswer("cobram duas vezes no cartão");

    expect(capturedPrompt).toContain("Art. 42 - Cobrança indevida");
    expect(capturedPrompt).toContain("cobram duas vezes no cartão");
  });
});
