import { IFlowEngine } from "../engine/flow-engine.interface";
import { IFlowMatcher } from "../flows/flow-matcher.interface";
import { flowRegistry } from "../flows/flow-registry";
import { ISessionStore } from "../sessions/session-store.interface";
import type { FlowOption, FlowResponse } from "../types/flow";
import { IMessageProcessor } from "./message-processor.interface";

export class MessageProcessorService implements IMessageProcessor {
  constructor(
    private flowEngine: IFlowEngine,
    private flowMatcher: IFlowMatcher,
    private sessionStore: ISessionStore
  ) {}

  async processIncomingMessage(from: string, body: string): Promise<string> {
    const existingSession = this.sessionStore.get(from);

    if (existingSession) {
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

    const matchedFlow = this.flowMatcher.findByMessage(body, flowRegistry);

    if (!matchedFlow) {
      return [
        "Olá! Sou o ProconBot Jacareí.",
        "No momento, posso te orientar sobre:",
        "1. Cobrança indevida",
        "2. Empréstimo não reconhecido",
        "3. Direito de arrependimento",
        "4. Cancelamento de plano ou serviço",
        "5. Garantia de produto",
        "",
        "Descreva seu problema com uma frase curta para eu tentar te encaminhar melhor."
      ].join("\n");
    }

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