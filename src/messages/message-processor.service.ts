import { FlowEngine } from "../engine/flow-engine";
import { FlowMatcher } from "../flows/flow-matcher";
import { flowRegistry, getFlowsAsMenu } from "../flows/flow-registry";
import { InMemorySessionStore } from "../sessions/in-memory-session-store";
import type { FlowDefinition, FlowOption, FlowResponse } from "../types/flow";

export class MessageProcessorService {
  private flowEngine: FlowEngine;
  private flowMatcher: FlowMatcher;
  private sessionStore: InMemorySessionStore;

  constructor() {
    this.flowEngine = new FlowEngine();
    this.flowMatcher = new FlowMatcher();
    this.sessionStore = new InMemorySessionStore();
  }

  async processIncomingMessage(from: string, body: string): Promise<string> {
    const existingSession = this.sessionStore.get(from);

    // If user is in an active flow session, check for return-to-menu command first
    if (existingSession) {
      // Check if user wants to return to menu
      if (body.trim().toLowerCase() === "menu" || body.trim().toLowerCase() === "0") {
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

    // No match found - show menu
    return getFlowsAsMenu(flowRegistry).menu;
  }

  private formatStep(question: string, options?: FlowOption[]): string {
    if (!options?.length) {
      return question;
    }

    const formattedOptions = options
      .map((option, index) => `${index + 1}. ${option.label}`)
      .join("\n");

    return `${question}\n\n${formattedOptions}`;
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

    return text;
  }
}