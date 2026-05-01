import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(plain: string): string {
  return createHash("sha256").update(plain, "utf8").digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}
