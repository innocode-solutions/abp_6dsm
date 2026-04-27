import { IFlowEngine } from "../engine/flow-engine.interface";
import { IFlowMatcher } from "../flows/flow-matcher.interface";
import { flowRegistry, getFlowsAsMenu } from "../flows/flow-registry";
import { KnowledgeService } from "../knowledge/knowledge-service";
import { ISessionStore } from "../sessions/session-store.interface";
import type { FlowDefinition, FlowOption, FlowResponse } from "../types/flow";
import { IMessageProcessor } from "./message-processor.interface";



/** Lembrete fixo adicionado ao rodapé de todas as respostas do bot. */
const MENU_REMINDER = "\n\n_Digite *menu* a qualquer momento para voltar ao menu principal._";

/** Termos que indicam pedido de ajuda/navegação (sem consulta jurídica). */
const HELP_TERMS = new Set(["ajuda", "ajude", "ajudar", "socorro", "orientar", "orientacao"]);

export class MessageProcessorService implements IMessageProcessor {
  constructor(
    private flowEngine: IFlowEngine,
    private flowMatcher: IFlowMatcher,
    private sessionStore: ISessionStore,
    private knowledgeService?: KnowledgeService
  ) {}

  async processIncomingMessage(from: string, body: string): Promise<string> {
    const existingSession = await this.sessionStore.get(from);

    // If user is in an active flow session, check for return-to-menu command first
    if (existingSession) {
      // Check if user wants to return to menu
      if (body.trim().toLowerCase() === "menu" || body.trim().toLowerCase() === "0") {
        await this.sessionStore.clear(from);
        return getFlowsAsMenu(flowRegistry).menu;
      }

      // Pedido genérico de ajuda dentro de um fluxo → mostra menu e encerra sessão
      if (this.isHelpRequest(body)) {
        await this.sessionStore.clear(from);
        return getFlowsAsMenu(flowRegistry).menu;
      }

      const flow = flowRegistry.find((item) => item.id === existingSession.flowId);

      if (!flow) {
        await this.sessionStore.clear(from);
        return "Não consegui continuar seu atendimento. Vamos começar novamente.";
      }

      const result = this.flowEngine.answerCurrentStep(
        flow,
        existingSession.flowSession,
        body
      );

      if (result.type === "step") {
        await this.sessionStore.save(existingSession);
        return this.formatStep(result.step.question, result.step.options);
      }

      await this.sessionStore.clear(from);
      return this.formatCompletedResponse(result.response);
    }

    // No active session - try to match new flow
    const matchResult = this.flowMatcher.findByMessage(body, flowRegistry);

    // Handle invalid menu number
    if (matchResult && typeof matchResult === "object" && "type" in matchResult) {
      if (matchResult.type === "invalid_menu_number") {
        const { menu } = getFlowsAsMenu(flowRegistry);
        return (
          `Essa opção não existe. Por favor, escolha uma opção de 1 a ${matchResult.maxOptions}.\n\n` +
          menu
        );
      }

      // Handle return-to-menu (shouldn't happen here but just in case)
      if (matchResult.type === "return_to_menu") {
        return getFlowsAsMenu(flowRegistry).menu;
      }
    }

    // If match is a valid flow, start it
    if (matchResult && typeof matchResult === "object" && "id" in matchResult) {
      const matchedFlow = matchResult as FlowDefinition;
      const flowSession = this.flowEngine.start(matchedFlow);

      await this.sessionStore.save({
        userId: from,
        flowId: matchedFlow.id,
        flowSession
      });

      const firstStep = this.flowEngine.getCurrentStep(matchedFlow, flowSession);

      if (!firstStep) {
        await this.sessionStore.clear(from);
        return "Não foi possível iniciar o atendimento. Tente novamente.";
      }

      return this.formatStep(firstStep.question, firstStep.options);
    }

    // Pedido genérico de ajuda sem sessão ativa → mostra o menu
    if (this.isHelpRequest(body)) {
      return getFlowsAsMenu(flowRegistry).menu;
    }

    // No flow match - try legal knowledge base via RAG
    const knowledgeAnswer = await this.knowledgeService?.findAnswer(body);

    if (knowledgeAnswer) {
      return knowledgeAnswer + MENU_REMINDER;
    }

    // Mensagem não reconhecida — orienta sem forçar o menu
    return "Não entendi sua mensagem. Pode reformular sua pergunta?" + MENU_REMINDER;
  }

  /**
   * Detecta pedidos curtos de ajuda/navegação ("me ajuda", "preciso de ajuda",
   * "socorro") para distingui-los de perguntas jurídicas reais.
   * Limita a 4 palavras para não interceptar consultas como
   * "preciso de ajuda com produto defeituoso".
   */
  private isHelpRequest(body: string): boolean {
    const normalized = body
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z\s]/g, "")
      .trim();
    const words = normalized.split(/\s+/).filter((w) => w.length > 0);
    if (words.length > 4) return false;
    return words.some((w) => HELP_TERMS.has(w));
  }

  private formatStep(question: string, options?: FlowOption[]): string {
    if (!options?.length) {
      return question + MENU_REMINDER;
    }

    const formattedOptions = options
      .map((option, index) => `${index + 1}. ${option.label}`)
      .join("\n");

    return `${question}\n\n${formattedOptions}${MENU_REMINDER}`;
  }

  private formatCompletedResponse(response: FlowResponse): string {
    let text = `${response.summary}\n\n${response.message}`;

    if (response.recommendations?.length) {
      text += `\n\nOrientações:\n- ${response.recommendations.join("\n- ")}`;
    }

    if (response.documents?.length) {
      text += `\n\nDocumentos sugeridos:\n- ${response.documents.join("\n- ")}`;
    }

    if (response.disclaimer) {
      text += `\n\n${response.disclaimer}`;
    }

    return text + MENU_REMINDER;
  }
}
