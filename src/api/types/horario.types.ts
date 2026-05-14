export enum StatusHorario {
  disponivel = "disponivel",
  pre_reservado = "pre_reservado",
  agendado = "agendado",
  bloqueado = "bloqueado",
  expirado = "expirado",
}

export interface IPreReserva {
  pre_reserva_id: string;
  conversa_id: string;
  expira_em: string;
  criada_em: string;
}
