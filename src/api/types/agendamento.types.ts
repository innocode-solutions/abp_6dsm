export enum StatusAgendamento {
  pendente = "pendente",
  confirmado = "confirmado",
  cancelado_pelo_cidadao = "cancelado_pelo_cidadao",
  cancelado_pelo_procon = "cancelado_pelo_procon",
  remarcado = "remarcado",
  check_in_realizado = "check_in_realizado",
  nao_compareceu = "nao_compareceu",
  concluido = "concluido",
  expirado = "expirado",
}

export enum OrigemAgendamento {
  whatsapp = "whatsapp",
}

export interface ICidadao {
  nome: string;
  cpf: string;
}

export interface ICalendarioExterno {
  provedor: string;
  evento_id: string;
  status_sincronizacao: string;
}
