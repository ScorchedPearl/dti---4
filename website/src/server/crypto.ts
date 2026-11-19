import "server-only";
import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const token = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const otpCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function passCode() {
  const pick = () => Array.from({ length: 4 }, () => ALPHA[randomInt(0, ALPHA.length)]).join("");
  return `IIITA26-${pick()}-${pick()}`;
}

export function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const key = scryptSync(pw, salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export function verifyPassword(pw: string, stored: string) {
  const [alg, s, k] = stored.split("$");
  if (alg !== "scrypt" || !s || !k) return false;
  const want = Buffer.from(k, "base64");
  const got = scryptSync(pw, Buffer.from(s, "base64"), want.length, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(want, got);
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
