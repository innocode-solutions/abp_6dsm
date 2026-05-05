import {
  FlowDefinition,
  FlowSession,
  FlowStep
} from "../types/flow";
import { FlowEngineResult } from "./flow-engine";

export interface IFlowEngine {
  start(flow: FlowDefinition): FlowSession;
  getCurrentStep(flow: FlowDefinition, session: FlowSession): FlowStep | null;
  answerCurrentStep(
    flow: FlowDefinition,
    session: FlowSession,
    answer: string
  ): FlowEngineResult;
}
