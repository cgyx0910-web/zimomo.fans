import { headers } from "next/headers";

const MAX_LEN = 128;

function sanitize(raw: string): string {
  const s = raw.trim().toLowerCase().slice(0, MAX_LEN);
  return s || "anon";
}

/**
 * 从当前请求头解析客户端 IP（Server Actions / RSC）。
 * 默认取 `x-forwarded-for` 首段；可设 `RATE_LIMIT_TRUSTED_HEADER`（如 `cf-connecting-ip`）覆盖。
 */
export async function getRequestIp(): Promise<string> {
  const h = await headers();
  const trusted = process.env.RATE_LIMIT_TRUSTED_HEADER?.trim();
  if (trusted) {
    const v = h.get(trusted);
    if (v) {
      return sanitize(v.split(",")[0] ?? v);
    }
  }
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) {
      return sanitize(first);
    }
  }
  const realIp = h.get("x-real-ip");
  if (realIp) {
    return sanitize(realIp);
  }
  return "anon";
}
