import { createHash } from "node:crypto";

const CPF_DIGITS = 11;

function onlyDigits(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

/**
 * Mascara CPF para exibição (LGPD): mantém blocos centrais visíveis.
 * Ex.: `12345678900` → `***.456.789-**`
 */
export function maskCpf(cpf: string): string {
  const digits = onlyDigits(cpf);
  if (digits.length !== CPF_DIGITS) {
    throw new Error("CPF deve conter 11 dígitos numéricos.");
  }
  const mid3 = digits.slice(3, 6);
  const mid3b = digits.slice(6, 9);
  return `***.${mid3}.${mid3b}-**`;
}

/**
 * Hash SHA-256 do CPF com salt do ambiente (`CPF_HASH_SALT`) para armazenamento seguro.
 */
export function hashCpf(cpf: string): string {
  const salt = process.env.CPF_HASH_SALT?.trim();
  if (!salt) {
    throw new Error("Variável de ambiente CPF_HASH_SALT é obrigatória para hashCpf.");
  }
  const digits = onlyDigits(cpf);
  if (digits.length !== CPF_DIGITS) {
    throw new Error("CPF deve conter 11 dígitos numéricos.");
  }
  return createHash("sha256").update(`${salt}:${digits}`, "utf8").digest("hex");
}
