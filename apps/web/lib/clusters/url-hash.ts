import { createHash } from "node:crypto";

const DROPPED_QUERY_KEYS = new Set([
  "fbclid",
  "gclid",
  "mc_eid",
  "ref",
]);

function shouldDropQueryKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (DROPPED_QUERY_KEYS.has(lower)) {
    return true;
  }
  if (lower.startsWith("utm_")) {
    return true;
  }
  return false;
}

/** 供 C2 桶化：仅 http(s)，其余返回 null */
export function canonicalizeUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();

  let pathname = url.pathname || "/";
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.replace(/\/+$/, "");
  }
  url.pathname = pathname.length ? pathname : "/";

  const kept = new URLSearchParams();
  const keys = [...url.searchParams.keys()].sort((a, b) =>
    a.localeCompare(b, "en")
  );
  for (const key of keys) {
    if (shouldDropQueryKey(key)) {
      continue;
    }
    for (const value of url.searchParams.getAll(key)) {
      kept.append(key, value);
    }
  }
  url.search = kept.toString() ? `?${kept.toString()}` : "";

  return url.toString();
}

/** sha256 hex 的前 32 字符（128 bit） */
export function computeUrlHash(raw: string | null | undefined): string | null {
  const canonical = canonicalizeUrl(raw);
  if (!canonical) {
    return null;
  }
  return createHash("sha256").update(canonical, "utf8").digest("hex").slice(0, 32);
}
