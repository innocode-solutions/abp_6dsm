import { randomUUID } from "node:crypto";
import type { RespostaPadrao } from "../types/common.types.js";

export function success<T>(dados: T, requisicao_id?: string): RespostaPadrao<T> {
  const id = requisicao_id?.trim() || randomUUID();
  return {
    dados,
    meta: {
      requisicao_id: id,
      timestamp: new Date().toISOString(),
    },
  };
}
