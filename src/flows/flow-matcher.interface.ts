import { FlowDefinition } from "../types/flow";

export interface IFlowMatcher {
  findByMessage(message: string, flows: FlowDefinition[]): FlowDefinition | null;
}
