import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const HASH_SEPARATOR = ":";

export async function hashSenha(senha: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(senha, salt, KEY_LENGTH)) as Buffer;
  return `${salt}${HASH_SEPARATOR}${derivedKey.toString("hex")}`;
}

export async function verificarSenha(senha: string, senhaHash: string): Promise<boolean> {
  const [salt, storedHash] = senhaHash.split(HASH_SEPARATOR);
  if (!salt || !storedHash) {
    return false;
  }

  const storedBuffer = Buffer.from(storedHash, "hex");
  const derivedKey = (await scrypt(senha, salt, storedBuffer.length)) as Buffer;

  if (storedBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, derivedKey);
}
