import { randomUUID } from "node:crypto";
import type { RespostaPadrao } from "../types/common.types.js";

export function buildMeta(requisicao_id?: string): {
  requisicao_id: string;
  timestamp: string;
} {
  const id = requisicao_id?.trim() || randomUUID();
  return {
    requisicao_id: id,
    timestamp: new Date().toISOString(),
  };
}

export function success<T>(dados: T, requisicao_id?: string): RespostaPadrao<T> {
  return {
    dados,
    meta: buildMeta(requisicao_id),
  };
}
