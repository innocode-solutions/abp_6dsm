import type { FlowDefinition } from "../types/flow";

/**
 * Converte um JSON importado para o tipo padrão de fluxo do sistema.
 * Usado para garantir compatibilidade entre os arquivos .json e o motor de fluxo.
 */
export function asFlow(flow: unknown): FlowDefinition {
  return flow as FlowDefinition;
}