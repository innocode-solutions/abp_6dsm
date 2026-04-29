/**
 * Barrel de compatibilidade: matcher completo está em {@link FlowExtractionOrchestrator}.
 */
export {
  FlowExtractionOrchestrator,
  NLP_NONE_INTENT,
  FlowExtractionOrchestrator as FlowMatcher
} from "../extraction/flow-extraction-orchestrator";
export { matchFlowDeterministic } from "../extraction/deterministic-flow-match";
