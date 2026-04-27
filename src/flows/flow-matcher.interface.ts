import { FlowDefinition, FlowMatcherResult } from "../types/flow";

export interface IFlowMatcher {
  findByMessage(message: string, flows: FlowDefinition[]): FlowMatcherResult;
}

