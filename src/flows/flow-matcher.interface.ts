import type { FlowDefinition } from "../types/flow";
import type { FlowMatchOutcome } from "../extraction/types";

export interface IFlowMatcher {
  findByMessage(message: string, flows: FlowDefinition[]): Promise<FlowMatchOutcome>;
}
