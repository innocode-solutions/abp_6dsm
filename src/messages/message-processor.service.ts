import { IFlowEngine } from "../engine/flow-engine.interface";
import { IFlowMatcher } from "../flows/flow-matcher.interface";
import { flowRegistry, getFlowsAsMenu } from "../flows/flow-registry";
import { KnowledgeService } from "../knowledge/knowledge-service";
import { ISessionStore } from "../sessions/session-store.interface";
import type { FlowDefinition, FlowOption, FlowResponse } from "../types/flow";
import { IMessageProcessor } from "./message-processor.interface";

/** Lembrete fixo adicionado ao rodapé de todas as respostas do bot. */
const MENU_REMINDER =
  "\n\n_Digite *menu* a qualquer momento para voltar ao menu principal._";

/** Termos que indicam pedido de ajuda/navegação (sem consulta jurídica). */
const HELP_TERMS = new Set([
  "ajuda",
  "ajude",
  "ajudar",
  "socorro",
  "orientar",
  "orientacao"
]);

export class MessageProcessorService implements IMessageProcessor {
  constructor(
    private flowEngine: IFlowEngine,
    private flowMatcher: IFlowMatcher,
    private sessionStore: ISessionStore,
    private knowledgeService?: KnowledgeService
  ) {}

  async processIncomingMessage(from: string, body: string): Promise<string> {
    return this.dispatchMessage(from, body);
  }

  private async dispatchMessage(from: string, body: string): Promise<string> {
    const existingSession = this.sessionStore.get(from);

    if (existingSession) {
      if (body.trim().toLowerCase() === "menu" || body.trim().toLowerCase() === "0") {
        this.sessionStore.clear(from);
        return getFlowsAsMenu(flowRegistry).menu;
      }

      if (this.isHelpRequest(body)) {
        this.sessionStore.clear(from);
        return getFlowsAsMenu(flowRegistry).menu;
      }

      const flow = flowRegistry.find((item) => item.id === existingSession.flowId);

      if (!flow) {
        this.sessionStore.clear(from);
        return "Não consegui continuar seu atendimento. Vamos começar novamente.";
      }

      const result = this.flowEngine.answerCurrentStep(
        flow,
        existingSession.flowSession,
        body
      );

      if (result.type === "step") {
        this.sessionStore.save(existingSession);
        return this.formatStep(result.step.question, result.step.options);
      }

      this.sessionStore.clear(from);
      return this.formatCompletedResponse(result.response);
    }

    // Antes do NLU: pedidos curtos de ajuda/navegação não devem abrir fluxo por classificação.
    if (this.isHelpRequest(body)) {
      return getFlowsAsMenu(flowRegistry).menu;
    }

    const matchOutcome = await this.flowMatcher.findByMessage(body, flowRegistry);
    const matchResult = matchOutcome.match;

    if (matchResult && typeof matchResult === "object" && "type" in matchResult) {
      if (matchResult.type === "invalid_menu_number") {
        const { menu } = getFlowsAsMenu(flowRegistry);
        return (
          `Essa opção não existe. Por favor, escolha uma opção de 1 a ${matchResult.maxOptions}.\n\n` +
          menu
        );
      }

      if (matchResult.type === "return_to_menu") {
        return getFlowsAsMenu(flowRegistry).menu;
      }
    }

    if (matchResult && typeof matchResult === "object" && "id" in matchResult) {
      const matchedFlow = matchResult as FlowDefinition;
      const flowSession = this.flowEngine.start(matchedFlow);

      this.sessionStore.save({
        userId: from,
        flowId: matchedFlow.id,
        flowSession
      });

      const firstStep = this.flowEngine.getCurrentStep(matchedFlow, flowSession);

      if (!firstStep) {
        this.sessionStore.clear(from);
        return "Não foi possível iniciar o atendimento. Tente novamente.";
      }

      return this.formatStep(firstStep.question, firstStep.options);
    }

    const knowledgeAnswer = await this.knowledgeService?.findAnswer(body);

    if (knowledgeAnswer) {
      return knowledgeAnswer + MENU_REMINDER;
    }

    return "Não entendi sua mensagem. Pode reformular sua pergunta?" + MENU_REMINDER;
  }

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
