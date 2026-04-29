import type { FlowSession } from "../types/flow";

export interface UserFlowSession {
  userId: string;
  flowId: string;
  flowSession: FlowSession;
}
