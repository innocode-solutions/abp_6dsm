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

    session.answers[currentStep.id] = answer;

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