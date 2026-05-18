import type { Request } from "express";

export {
  assertCamposObrigatorios,
  assertObjectId,
} from "../../utils/validationHelper.js";

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
