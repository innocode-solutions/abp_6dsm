import {
  FlowDefinition,
  FlowResponse,
  FlowRule,
  FlowSession,
  FlowStep
} from "../types/flow";

export interface FlowEngineNextStepResult {
  type: "step";
  step: FlowStep;
}

export interface FlowEngineCompletedResult {
  type: "completed";
  responseKey: string;
  response: FlowResponse;
}

export type FlowEngineResult =
  | FlowEngineNextStepResult
  | FlowEngineCompletedResult;

export class FlowEngine {
  start(flow: FlowDefinition): FlowSession {
    return {
      flowId: flow.id,
      currentStepIndex: 0,
      answers: {},
      finished: false
    };
  }

  getCurrentStep(flow: FlowDefinition, session: FlowSession): FlowStep | null {
    this.validateSessionFlow(flow, session);

    if (session.finished) return null;
    return flow.steps[session.currentStepIndex] ?? null;
  }

  answerCurrentStep(
    flow: FlowDefinition,
    session: FlowSession,
    answer: string
  ): FlowEngineResult {
    this.validateSessionFlow(flow, session);

    if (session.finished) {
      throw new Error("Flow already finished.");
    }

    const currentStep = this.getCurrentStep(flow, session);

    if (!currentStep) {
      session.finished = true;

      return {
        type: "completed",
        responseKey: "fallback",
        response: this.getFallbackResponse(flow)
      };
    }

    // Normaliza a resposta do usuário (ex: "1" → value da opção)
    const normalizedAnswer = this.normalizeAnswer(currentStep, answer);
    session.answers[currentStep.id] = normalizedAnswer;

    const matchedRule = this.findMatchingRule(flow.rules, session.answers);

    if (matchedRule) {
      const response = flow.responses[matchedRule.response];

      if (!response) {
        throw new Error(
          `Response "${matchedRule.response}" not found in flow "${flow.id}".`
        );
      }

      session.finished = true;

      return {
        type: "completed",
        responseKey: matchedRule.response,
        response
      };
    }

    session.currentStepIndex += 1;

    const nextStep = this.getCurrentStep(flow, session);

    if (!nextStep) {
      session.finished = true;

      return {
        type: "completed",
        responseKey: "fallback",
        response: this.getFallbackResponse(flow)
      };
    }

    return {
      type: "step",
      step: nextStep
    };
  }

  private normalizeAnswer(step: FlowStep, answer: string): string {
    const normalized = answer.trim().toLowerCase();

    if (step.type !== "choice" || !step.options?.length) {
      return normalized;
    }

    // Caso usuário responda com número (1, 2, 3...)
    const numericOption = Number(normalized);

    if (
      !Number.isNaN(numericOption) &&
      numericOption >= 1 &&
      numericOption <= step.options.length
    ) {
      return step.options[numericOption - 1].value;
    }

    // Caso responda com texto (label ou value)
    const matchedOption = step.options.find(
      (option) =>
        option.value.toLowerCase() === normalized ||
        option.label.toLowerCase() === normalized
    );

    if (matchedOption) {
      return matchedOption.value;
    }

    return normalized;
  }

  private findMatchingRule(
    rules: FlowRule[],
    answers: Record<string, string>
  ): FlowRule | undefined {
    return rules.find((rule) => {
      return Object.entries(rule.conditions).every(([field, expectedValue]) => {
        return answers[field] === expectedValue;
      });
    });
  }

  private getFallbackResponse(flow: FlowDefinition): FlowResponse {
    const fallback = flow.responses["fallback"];

    if (!fallback) {
      throw new Error(`Fallback response not found in flow "${flow.id}".`);
    }

    return fallback;
  }

  private validateSessionFlow(
    flow: FlowDefinition,
    session: FlowSession
  ): void {
    if (session.flowId !== flow.id) {
      throw new Error(
        `Session flowId "${session.flowId}" does not match flow "${flow.id}".`
      );
    }
  }
}