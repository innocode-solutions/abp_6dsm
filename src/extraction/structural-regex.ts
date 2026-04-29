import type { StructuralEntity, StructuralEntityKind } from "./types";

const CPF_REGEX = /\b(\d{3})[.\s]?(\d{3})[.\s]?(\d{3})[-.]?(\d{2})\b/g;
const CNPJ_REGEX = /\b(\d{2})[.]?(\d{3})[.]?(\d{3})[/]?(\d{4})[-.]?(\d{2})\b/g;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const TELEFONE_REGEX =
  /\b(?:\+55\s*)?(?:\(?(\d{2})\)?\s*)?(?:9\s*)?(\d{4})[-.]?(\d{4})\b/g;
const VALOR_BRL_REGEX = /\bR\$\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\b/gi;
const DATA_REGEX = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g;

function pushUnique(
  out: StructuralEntity[],
  seen: Set<string>,
  kind: StructuralEntityKind,
  rawMatch: string,
  value: string
): void {
  const key = `${kind}:${rawMatch}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push({ type: kind, value, rawMatch });
}

function normalizeCpf(groups: RegExpExecArray): string | null {
  const d = groups[0].replace(/\D/g, "");
  if (d.length !== 11) return null;
  return d;
}

function normalizeCnpj(groups: RegExpExecArray): string | null {
  const d = groups[0].replace(/\D/g, "");
  if (d.length !== 14) return null;
  return d;
}

/**
 * Extrai entidades estruturais com regex (camada paralela ao NLU textual).
 */
export function extractStructuralEntities(text: string): StructuralEntity[] {
  const out: StructuralEntity[] = [];
  const seen = new Set<string>();

  let m: RegExpExecArray | null;
  const cpfRe = new RegExp(CPF_REGEX.source, CPF_REGEX.flags);
  while ((m = cpfRe.exec(text)) !== null) {
    const norm = normalizeCpf(m);
    if (norm) pushUnique(out, seen, "cpf", m[0], norm);
  }

  const cnpjRe = new RegExp(CNPJ_REGEX.source, CNPJ_REGEX.flags);
  while ((m = cnpjRe.exec(text)) !== null) {
    const norm = normalizeCnpj(m);
    if (norm) pushUnique(out, seen, "cnpj", m[0], norm);
  }

  const mailRe = new RegExp(EMAIL_REGEX.source, EMAIL_REGEX.flags);
  while ((m = mailRe.exec(text)) !== null) {
    pushUnique(out, seen, "email", m[0], m[0].toLowerCase());
  }

  const valorRe = new RegExp(VALOR_BRL_REGEX.source, VALOR_BRL_REGEX.flags);
  while ((m = valorRe.exec(text)) !== null) {
    pushUnique(out, seen, "valor_brl", m[0], m[0].replace(/\s+/g, ""));
  }

  const dataRe = new RegExp(DATA_REGEX.source, DATA_REGEX.flags);
  while ((m = dataRe.exec(text)) !== null) {
    pushUnique(out, seen, "data_dd_mm_yyyy", m[0], m[0]);
  }

  const telRe = new RegExp(TELEFONE_REGEX.source, TELEFONE_REGEX.flags);
  while ((m = telRe.exec(text)) !== null) {
    const digits = m[0].replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 13) {
      pushUnique(out, seen, "telefone_br", m[0], digits);
    }
  }

  return out;
}
