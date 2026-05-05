import rawCobrancaIndevida from "./cobranca-indevida.json";
import rawEmprestimoNaoReconhecido from "./emprestimo-nao-reconhecido.json";
import rawDireitoArrependimento from "./direito-arrependimento.json";
import rawCancelamentoPlano from "./cancelamento-plano.json";
import rawGarantiaProduto from "./garantia-produto.json";

import { asFlow } from "../utils/as-flow";
import type { FlowDefinition } from "../types/flow";

export const flowRegistry = [
  asFlow(rawCobrancaIndevida),
  asFlow(rawEmprestimoNaoReconhecido),
  asFlow(rawDireitoArrependimento),
  asFlow(rawCancelamentoPlano),
  asFlow(rawGarantiaProduto)
];

/**
 * Generates a formatted menu of available flows with numeric options.
 * Returns the formatted menu string and a map of number-to-flow for easy lookup.
 */
export function getFlowsAsMenu(flows: FlowDefinition[]): {
  menu: string;
  flowMap: Record<string, FlowDefinition>;
} {
  const flowMap: Record<string, FlowDefinition> = {};
  const menuLines: string[] = [
    "Olá! Sou o ProconBot Jacareí.",
    "No momento, posso te orientar sobre:",
    ""
  ];

  flows.forEach((flow, index) => {
    const number = index + 1;
    flowMap[number.toString()] = flow;
    menuLines.push(`${number}. ${flow.title}`);
  });

  menuLines.push("");
  menuLines.push('Digite o número da opção desejada ou "menu" para voltar a este menu.');

  return {
    menu: menuLines.join("\n"),
    flowMap
  };
}