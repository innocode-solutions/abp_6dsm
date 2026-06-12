const FLOW_LABELS: Record<string, string> = {
  cobranca_indevida: "Cobrança indevida",
  garantia_produto: "Garantia de produto",
  cancelamento_plano: "Cancelamento de plano",
  direito_arrependimento: "Direito de arrependimento",
  emprestimo_nao_reconhecido: "Empréstimo não reconhecido",
  agendamento: "Agendamento"
};

export function getFlowLabel(flowId: string): string {
  const normalized = flowId.trim();

  if (!normalized) {
    return "Outros";
  }

  const knownLabel = FLOW_LABELS[normalized];
  if (knownLabel) {
    return knownLabel;
  }

  return normalized
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (first) => first.toUpperCase());
}
