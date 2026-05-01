import { checkRateLimit, type RateLimitResult } from "./in-memory";

export type { RateLimitResult };
export { checkRateLimit } from "./in-memory";

/** 拼接限流维度（避免未 trim 的空白）。 */
export function buildRateKey(...parts: (string | null | undefined)[]): string {
  return parts
    .map((p) => String(p ?? "").trim().slice(0, 256))
    .filter(Boolean)
    .join(":");
}

export async function enforceRateLimit(params: {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  if (process.env.RATE_LIMIT_DISABLED === "true") {
    return { allowed: true, remaining: params.limit, retryAfterMs: 0 };
  }
  const safeKey = params.key.trim().slice(0, 512) || "empty";
  return checkRateLimit({
    bucketKey: `${params.bucket}:${safeKey}`,
    limit: params.limit,
    windowMs: params.windowMs,
  });
}

export function rateLimitMessage(rl: RateLimitResult): string {
  if (rl.allowed) {
    return "";
  }
  const sec = Math.ceil(rl.retryAfterMs / 1000);
  return sec > 0
    ? `操作过于频繁，请约 ${sec} 秒后重试。`
    : "操作过于频繁，请稍后再试。";
}
