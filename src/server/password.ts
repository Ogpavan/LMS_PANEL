import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const HASH_PREFIX = "scrypt";
const KEY_LENGTH = 64;

function toBuffer(value: string) {
  return Buffer.from(value, "hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, KEY_LENGTH).toString("hex");

  return `${HASH_PREFIX}:${salt}:${derivedKey}`;
}

export function isPasswordHash(value: string) {
  return value.startsWith(`${HASH_PREFIX}:`);
}

export function verifyPassword(password: string, storedPassword: string) {
  if (!isPasswordHash(storedPassword)) {
    return password === storedPassword;
  }

  const [, salt, expectedHash] = storedPassword.split(":");

  if (!salt || !expectedHash) {
    return false;
  }

  const passwordBuffer = toBuffer(scryptSync(password, salt, KEY_LENGTH).toString("hex"));
  const expectedBuffer = toBuffer(expectedHash);

  if (passwordBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(passwordBuffer, expectedBuffer);
}
