import type { FlowDefinition } from "../types/flow";
import { IFlowMatcher } from "./flow-matcher.interface";

export class FlowMatcher implements IFlowMatcher {
  findByMessage(message: string, flows: FlowDefinition[]): FlowDefinition | null {
    const normalizedMessage = message.trim().toLowerCase();

    for (const flow of flows) {
      const matched = flow.triggers.some((trigger) =>
        normalizedMessage.includes(trigger.toLowerCase())
      );

      if (matched) {
        return flow;
      }
    }

    return null;
  }
}