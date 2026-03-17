/**
 * Define o contrato (interfaces) dos fluxos do chatbot.
 * Todos os fluxos devem seguir essa estrutura para que o motor de fluxo
 * consiga interpretá-los de forma padronizada.
 */

export interface FlowStep {
  id: string;
  question: string;
  type: "choice" | "text";
  options?: string[];
}

export interface FlowResult {
  summary: string;
  recommendation: string[];
  documents?: string[];
}

export interface FlowDefinition {
  id: string;
  title: string;
  triggers: string[];
  steps: FlowStep[];
  results: Record<string, FlowResult>;
}