import { describe, expect, it } from "vitest";
import { KnowledgeService } from "../../src/knowledge/knowledge-service";
import type { IKnowledgeRepository } from "../../src/knowledge/knowledge-repository.interface";

describe("KnowledgeService", () => {
  it("deve retornar null quando não houver resultado", () => {
    const repository: IKnowledgeRepository = {
      search: () => []
    };
    const service = new KnowledgeService(repository);

    const response = service.findAnswer("oi");
    expect(response).toBeNull();
  });

  it("deve montar resposta formatada com artigo encontrado", () => {
    const repository: IKnowledgeRepository = {
      search: () => [
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

    const response = service.findAnswer("comprei na internet e quero cancelar");

    expect(response).not.toBeNull();
    expect(response).toContain("Código de Defesa do Consumidor");
    expect(response).toContain("Art. 49");
  });
});