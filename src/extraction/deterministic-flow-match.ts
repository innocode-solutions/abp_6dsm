import type {
  FlowDefinition,
  MatcherInvalidMenuNumber,
  MatcherReturnToMenu
} from "../types/flow";

export type DeterministicMatcherResult =
  | FlowDefinition
  | MatcherInvalidMenuNumber
  | MatcherReturnToMenu
  | null;

/**
 * Ramo determinístico idêntico ao antigo FlowMatcher.findByMessage
 * (antes de NLU).
 */
export function matchFlowDeterministic(
  message: string,
  flows: FlowDefinition[]
): DeterministicMatcherResult {
  const normalizedMessage = message.trim().toLowerCase();

  if (normalizedMessage === "menu" || normalizedMessage === "0") {
    return { type: "return_to_menu" };
  }

  const menuNumber = Number(normalizedMessage);
  if (!Number.isNaN(menuNumber) && menuNumber >= 1 && menuNumber <= flows.length) {
    return flows[menuNumber - 1];
  }

  if (!Number.isNaN(menuNumber) && menuNumber >= 1) {
    return {
      type: "invalid_menu_number",
      attemptedNumber: menuNumber,
      maxOptions: flows.length
    };
  }

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
