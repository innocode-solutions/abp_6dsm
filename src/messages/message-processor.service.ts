import type { IEntityExtractionRepository } from "../extraction/entity-extraction-repository.interface";
import type { FlowNlpClassification } from "../extraction/types";
import { extractStructuralEntities } from "../extraction/structural-regex";
import { IFlowEngine } from "../engine/flow-engine.interface";
import { IFlowMatcher } from "../flows/flow-matcher.interface";
import { flowRegistry, getFlowsAsMenu } from "../flows/flow-registry";
import { KnowledgeService } from "../knowledge/knowledge-service";
import { ISessionStore } from "../sessions/session-store.interface";
import type { FlowDefinition, FlowOption, FlowResponse } from "../types/flow";
import {
  type ConversationMessageContext,
  IMessageProcessor
} from "./message-processor.interface";

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

interface DispatchOutcome {
  readonly text: string;
  readonly nlpClassification: FlowNlpClassification | null;
  readonly flowIdActive?: string;
}

export class MessageProcessorService implements IMessageProcessor {
  constructor(
    private flowEngine: IFlowEngine,
    private flowMatcher: IFlowMatcher,
    private sessionStore: ISessionStore,
    private knowledgeService?: KnowledgeService,
    private entityRepository?: IEntityExtractionRepository
  ) {}

  async processIncomingMessage(
    from: string,
    body: string,
    context?: ConversationMessageContext
  ): Promise<string> {
    const structuralEntities = extractStructuralEntities(body);
    const { text, nlpClassification, flowIdActive } = await this.dispatchMessage(
      from,
      body
    );

    await this.maybePersistExtraction(
      from,
      body,
      structuralEntities,
      nlpClassification,
      flowIdActive,
      context?.sessionId
    );

    return text;
  }

  private async dispatchMessage(from: string, body: string): Promise<DispatchOutcome> {
    const existingSession = this.sessionStore.get(from);

    if (existingSession) {
      if (body.trim().toLowerCase() === "menu" || body.trim().toLowerCase() === "0") {
        this.sessionStore.clear(from);
        return {
          text: getFlowsAsMenu(flowRegistry).menu,
          nlpClassification: null,
          flowIdActive: undefined
        };
      }

      if (this.isHelpRequest(body)) {
        this.sessionStore.clear(from);
        return {
          text: getFlowsAsMenu(flowRegistry).menu,
          nlpClassification: null,
          flowIdActive: undefined
        };
      }

      const flow = flowRegistry.find((item) => item.id === existingSession.flowId);

      if (!flow) {
        this.sessionStore.clear(from);
        return {
          text: "Não consegui continuar seu atendimento. Vamos começar novamente.",
          nlpClassification: null,
          flowIdActive: undefined
        };
      }

      const result = this.flowEngine.answerCurrentStep(
        flow,
        existingSession.flowSession,
        body
      );

      if (result.type === "step") {
        this.sessionStore.save(existingSession);
        return {
          text: this.formatStep(result.step.question, result.step.options),
          nlpClassification: null,
          flowIdActive: existingSession.flowId
        };
      }

      this.sessionStore.clear(from);
      return {
        text: this.formatCompletedResponse(result.response),
        nlpClassification: null,
        flowIdActive: undefined
      };
    }

    if (this.isHelpRequest(body)) {
      return {
        text: getFlowsAsMenu(flowRegistry).menu,
        nlpClassification: null,
        flowIdActive: undefined
      };
    }

    const matchOutcome = await this.flowMatcher.findByMessage(body, flowRegistry);
    const matchResult = matchOutcome.match;
    const nlpClassification = matchOutcome.nlpClassification ?? null;

    if (matchResult && typeof matchResult === "object" && "type" in matchResult) {
      if (matchResult.type === "invalid_menu_number") {
        const { menu } = getFlowsAsMenu(flowRegistry);
        return {
          text:
            `Essa opção não existe. Por favor, escolha uma opção de 1 a ${matchResult.maxOptions}.\n\n` +
            menu,
          nlpClassification,
          flowIdActive: undefined
        };
      }

      if (matchResult.type === "return_to_menu") {
        return {
          text: getFlowsAsMenu(flowRegistry).menu,
          nlpClassification,
          flowIdActive: undefined
        };
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
        return {
          text: "Não foi possível iniciar o atendimento. Tente novamente.",
          nlpClassification,
          flowIdActive: matchedFlow.id
        };
      }

      return {
        text: this.formatStep(firstStep.question, firstStep.options),
        nlpClassification,
        flowIdActive: matchedFlow.id
      };
    }

    const knowledgeAnswer = await this.knowledgeService?.findAnswer(body);

    if (knowledgeAnswer) {
      return {
        text: knowledgeAnswer + MENU_REMINDER,
        nlpClassification,
        flowIdActive: undefined
      };
    }

    return {
      text: "Não entendi sua mensagem. Pode reformular sua pergunta?" + MENU_REMINDER,
      nlpClassification,
      flowIdActive: undefined
    };
  }

  private async maybePersistExtraction(
    userId: string,
    body: string,
    structuralEntities: ReturnType<typeof extractStructuralEntities>,
    nlpClassification: FlowNlpClassification | null,
    flowId: string | undefined,
    sessionId?: string
  ): Promise<void> {
    if (!this.entityRepository || !sessionId) {
      return;
    }

    await this.entityRepository.appendExtraction({
      sessionId,
      userId,
      body,
      structuralEntities,
      nlpClassification,
      flowId
    });
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
