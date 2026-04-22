import { describe, it, expect, beforeEach } from "vitest";
import { MessageProcessorService } from "../../src/messages/message-processor.service";
import { FlowEngine } from "../../src/engine/flow-engine";
import { FlowMatcher } from "../../src/flows/flow-matcher";
import { KnowledgeService } from "../../src/knowledge/knowledge-service";
import type { IKnowledgeRepository } from "../../src/knowledge/knowledge-repository.interface";
import { InMemorySessionStore } from "../../src/sessions/in-memory-session-store";

describe("MessageProcessorService - Menu and Numeric Selection", () => {
  let processor: MessageProcessorService;
  const knowledgeRepositoryMock: IKnowledgeRepository = {
    search: () => []
  };

  beforeEach(() => {
    processor = new MessageProcessorService(
      new FlowEngine(),
      new FlowMatcher(),
      new InMemorySessionStore(),
      new KnowledgeService(knowledgeRepositoryMock)
    );
  });


  describe("First Message - Menu Display", () => {
    it("deve exibir menu quando primeira mensagem é genérica ('oi')", async () => {
      const response = await processor.processIncomingMessage("user1", "oi");

      expect(response).toContain("Olá! Sou o ProconBot Jacareí");
      expect(response).toContain("1.");
      expect(response).toContain("2.");
      expect(response).toContain("3.");
      expect(response).toContain("4.");
      expect(response).toContain("5.");
    });

    it("deve exibir menu quando primeira mensagem não dá match", async () => {
      const response = await processor.processIncomingMessage("user2", "xyz123");

      expect(response).toContain("Olá! Sou o ProconBot Jacareí");
      expect(response).toContain("1.");
    });
  });

  describe("Numeric Selection - Valid Numbers", () => {
    it("deve iniciar fluxo de cobrança indevida quando usuário digita 1", async () => {
      const response = await processor.processIncomingMessage("user3", "1");

      // Primeira pergunta do fluxo deve aparecer
      expect(response).toContain("Você reconhece ou contratou essa cobrança?");
      expect(response).toContain("1.");
      expect(response).toContain("2.");
    });

    it("deve iniciar fluxo correto para cada número (1-5)", async () => {
      const user = "user_flow_test";

      // Testar números 1-5
      for (let i = 1; i <= 5; i++) {
        const response = await processor.processIncomingMessage(user + i, i.toString());
        
        // Deve conter uma pergunta (não o menu)
        expect(response.length).toBeGreaterThan(0);
        expect(response).not.toContain("Olá! Sou o ProconBot Jacareí");
      }
    });
  });

  describe("Numeric Selection - Invalid Numbers", () => {
    it("deve retornar erro e mostrar menu para número inválido (10)", async () => {
      const response = await processor.processIncomingMessage("user4", "10");

      expect(response).toContain("Essa opção não existe");
      expect(response).toContain("Olá! Sou o ProconBot Jacareí");
      expect(response).toContain("1.");
      expect(response).toContain("5.");
    });

    it("deve retornar erro e mostrar menu para número 99", async () => {
      const response = await processor.processIncomingMessage("user5", "99");

      expect(response).toContain("Essa opção não existe");
      expect(response).toContain("Olá! Sou o ProconBot Jacareí");
    });
  });

  describe("Return to Menu", () => {
    it("deve voltar ao menu quando usuário digita 'menu' durante fluxo", async () => {
      const user = "user6";

      // Iniciar fluxo
      let response = await processor.processIncomingMessage(user, "1");
      expect(response).toContain("Você reconhece ou contratou essa cobrança?");

      // Digitar "menu" para voltar
      response = await processor.processIncomingMessage(user, "menu");
      expect(response).toContain("Olá! Sou o ProconBot Jacareí");
      expect(response).toContain("1.");
    });

    it("deve voltar ao menu quando usuário digita '0' durante fluxo", async () => {
      const user = "user7";

      // Iniciar fluxo
      let response = await processor.processIncomingMessage(user, "2");
      expect(response).not.toContain("Olá! Sou o ProconBot Jacareí");

      // Digitar "0" para voltar
      response = await processor.processIncomingMessage(user, "0");
      expect(response).toContain("Olá! Sou o ProconBot Jacareí");
      expect(response).toContain("1.");
    });
  });

  describe("Text Triggers - Existing Behavior", () => {
    it("deve continuar funcionando com text triggers", async () => {
      const response = await processor.processIncomingMessage("user8", "cancelar serviço");

      // Deve iniciar fluxo de cancelamento
      expect(response).toContain("Qual tipo de plano ou serviço você quer cancelar?");
    });
  });

  describe("Numeric Options within Flow", () => {
    it("deve aceitar números como resposta dentro do fluxo", async () => {
      const user = "user9";

      // Iniciar fluxo de cobrança
      let response = await processor.processIncomingMessage(user, "1");
      expect(response).toContain("Você reconhece ou contratou essa cobrança?");

      // Responder com número 1
      response = await processor.processIncomingMessage(user, "1");

      // Deve continuar ou finalizar (próxima pergunta ou resposta final)
      expect(response.length).toBeGreaterThan(0);
    });

    it("deve aceitar números 1, 2, 3... como respostas dentro do fluxo", async () => {
      const user = "user10";

      // Iniciar fluxo de garantia
      let response = await processor.processIncomingMessage(user, "5");
      expect(response).toContain("O produto apresentou defeito ou vício?");

      // Responder com diferentes números
      response = await processor.processIncomingMessage(user, "1");
      expect(response.length).toBeGreaterThan(0);
    });
  });

  describe("Case Insensitivity", () => {
    it("deve ser case-insensitive para 'menu'", async () => {
      const user = "user11";

      // Iniciar fluxo
      let response = await processor.processIncomingMessage(user, "1");
      expect(response).not.toContain("Olá! Sou o ProconBot Jacareí");

      // Tentar voltar com diferentes capitalizações
      const testCases = ["MENU", "Menu", "MeNu"];

      for (const testCase of testCases) {
        const user_variant = user + "_" + testCase;
        
        // Iniciar novo fluxo para cada teste
        response = await processor.processIncomingMessage(user_variant, "1");
        
        // Tentar voltar
        response = await processor.processIncomingMessage(user_variant, testCase);
        expect(response).toContain("Olá! Sou o ProconBot Jacareí");
      }
    });
  });

  describe("CDC Knowledge Fallback", () => {
    it("deve responder com base CDC quando não há match de fluxo", async () => {
      const processorWithKnowledge = new MessageProcessorService(
        new FlowEngine(),
        new FlowMatcher(),
        new InMemorySessionStore(),
        new KnowledgeService({
          search: () => [
            {
              score: 2,
              entry: {
                id: "cdc-42",
                title: "Art. 42 - Cobrança indevida",
                body: "Em caso de cobrança indevida, o consumidor pode ter devolução em dobro."
              }
            }
          ]
        })
      );

      const response = await processorWithKnowledge.processIncomingMessage(
        "user-cdc",
        "quais são meus direitos do consumidor"
      );

      expect(response).toContain("Código de Defesa do Consumidor");
      expect(response).toContain("Art. 42 - Cobrança indevida");
      expect(response).toContain("devolução em dobro");
    });
  });
});
