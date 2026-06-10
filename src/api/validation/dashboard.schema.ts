import { z } from "zod";

/**
 * Schema de validação para o query param `users` do endpoint de dashboard.
 *
 * Regras de sanitização:
 *  - Deve ser string não-vazia
 *  - Máximo de 200 caracteres (evita payload gigante)
 *  - Apenas caracteres alfanuméricos, +, @, vírgula, hífen e underscore
 *    → bloqueia injeção de operadores MongoDB ($where, $gt…) e caracteres de controle
 *  - Após split, cada userId deve ter entre 1 e 50 caracteres
 *  - Limite de 20 usuários por requisição
 */
const USER_ID_REGEX = /^[a-zA-Z0-9+@,_\-]+$/;
const USER_ITEM_REGEX = /^[a-zA-Z0-9+@_\-]{1,50}$/;

export const usersParamSchema = z
  .string({
    error: "Parâmetro 'users' é obrigatório e deve ser uma string.",
  })
  .max(200, "Parâmetro 'users' excede o tamanho máximo de 200 caracteres.")
  .regex(USER_ID_REGEX, "Parâmetro 'users' contém caracteres inválidos.");

/**
 * Sanitiza e retorna o array de userIds validados.
 * Lança ZodError se a entrada for inválida.
 */
export function parseUserIds(raw: unknown): string[] {
  const users = usersParamSchema.parse(raw);

  const ids = users
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    throw new Error("Nenhum userId válido encontrado após parsing.");
  }

  if (ids.length > 20) {
    throw new Error("Limite de 20 usuários por requisição.");
  }

  const invalid = ids.filter((id) => !USER_ITEM_REGEX.test(id));
  if (invalid.length > 0) {
    throw new Error(`UserIds inválidos: ${invalid.join(", ")}`);
  }

  return ids;
}
