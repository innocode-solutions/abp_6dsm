export type PerfilUsuario = "admin" | "atendente";

export interface RespostaPadrao<T> {
  dados: T;
  meta: {
    requisicao_id: string;
    timestamp: string;
  };
}

export class AppError extends Error {
  readonly codigo: string;
  readonly mensagem: string;
  readonly httpStatus: number;

  constructor(codigo: string, httpStatus: number, mensagem?: string) {
    const msg = mensagem ?? codigo;
    super(msg);
    this.name = "AppError";
    this.codigo = codigo;
    this.mensagem = msg;
    this.httpStatus = httpStatus;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
