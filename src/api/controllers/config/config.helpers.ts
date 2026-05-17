import type { Request } from "express";
import mongoose from "mongoose";

import { AppError } from "../../types/common.types.js";

export function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export function filtroAtivo(query: Request["query"]): { ativo?: boolean } {
  const raw = query.ativo;
  if (raw === "false") {
    return { ativo: false };
  }
  if (raw === "all") {
    return {};
  }
  return { ativo: true };
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

export function assertObjectId(id: string, campo: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("ERRO_VALIDACAO", 400, `${campo} inválido.`);
  }
}
