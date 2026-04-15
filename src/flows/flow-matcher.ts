import type { FlowDefinition } from "../types/flow";
import { IFlowMatcher } from "./flow-matcher.interface";

export class FlowMatcher implements IFlowMatcher {
  findByMessage(message: string, flows: FlowDefinition[]): FlowDefinition | null {
    const normalizedMessage = message.trim().toLowerCase();

    // Check for special triggers: return to menu
    if (normalizedMessage === "menu" || normalizedMessage === "0") {
      return { type: "return_to_menu" };
    }

    // Check if message is a number (menu selection)
    const menuNumber = Number(normalizedMessage);
    if (
      !Number.isNaN(menuNumber) &&
      menuNumber >= 1 &&
      menuNumber <= flows.length
    ) {
      // Valid menu number: return the corresponding flow
      return flows[menuNumber - 1];
    }

    // If it looks like a number but invalid range, return special marker
    if (!Number.isNaN(menuNumber) && menuNumber >= 1) {
      return {
        type: "invalid_menu_number",
        attemptedNumber: menuNumber,
        maxOptions: flows.length
      };
    }

    // Try to match by flow triggers
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