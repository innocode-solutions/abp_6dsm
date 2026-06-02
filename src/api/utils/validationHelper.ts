import mongoose from "mongoose";

import { AppError } from "../types/common.types.js";

export function assertObjectId(id: string, campo: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("ERRO_VALIDACAO", 400, `${campo} inválido.`);
  }
}

export function assertCamposObrigatorios(
  body: Record<string, unknown>,
  campos: string[],
): void {
  const faltando = campos.filter((campo) => {
    const valor = body[campo];
    if (valor === undefined || valor === null) {
      return true;
    }
    if (typeof valor === "string" && valor.trim() === "") {
      return true;
    }
    return false;
  });

  if (faltando.length > 0) {
    throw new AppError("ERRO_VALIDACAO", 400);
  }
}

export function assertNumeroPositivo(valor: unknown, campo: string): number {
  const numero = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(numero) || numero < 1) {
    throw new AppError("ERRO_VALIDACAO", 400, `${campo} inválido.`);
  }
  return numero;
}
