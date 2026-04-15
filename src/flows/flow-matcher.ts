import type { FlowDefinition } from "../types/flow";

export class FlowMatcher {
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