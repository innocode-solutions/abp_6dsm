/**
 * flow.ts define os tipos/interfaces dos fluxos.
 * Os arquivos .json em src/flows são os fluxos reais que seguem esse formato.
 * O motor de fluxo usa esses tipos para executar qualquer fluxo de forma genérica.
 */

export interface FlowOption {
  label: string;
  value: string;
}

export interface FlowStep {
  id: string;
  question: string;
  type: "choice" | "text";
  options?: FlowOption[];
}

export interface FlowRule {
  conditions: Record<string, string>;
  response: string;
}

export interface FlowResponse {
  summary: string;
  message: string;
  recommendations?: string[];
  documents?: string[];
  disclaimer?: string;
}

export interface FlowDefinition {
  id: string;
  title: string;
  description?: string;
  triggers: string[];
  steps: FlowStep[];
  rules: FlowRule[];
  responses: Record<string, FlowResponse>;
}

export interface FlowSession {
  flowId: string;
  currentStepIndex: number;
  answers: Record<string, string>;
  finished: boolean;
}