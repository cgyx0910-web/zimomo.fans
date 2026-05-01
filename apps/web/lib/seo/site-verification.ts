import type { Metadata } from "next";

import { isPublicIndexingEnabled } from "@/lib/seo/indexable";

function readEnv(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v ? v : undefined;
}

/** 解析 `OTHER_SITE_VERIFICATION`：分号或换行分隔，每行 `metaName=value` */
function parseOtherList(raw: string | undefined): Record<string, string[]> {
  if (!raw) {
    return {};
  }
  const out: Record<string, string[]> = {};
  for (const line of raw.split(/[\n;]+/g)) {
    const s = line.trim();
    if (!s || !s.includes("=")) {
      continue;
    }
    const eq = s.indexOf("=");
    const key = s.slice(0, eq).trim();
    const value = s.slice(eq + 1).trim();
    if (!key || !value) {
      continue;
    }
    (out[key] ??= []).push(value);
  }
  return out;
}

/**
 * F4：仅当站点允许公网索引时才注入验证 meta，避免 staging 误认领生产所有权。
 * Bing Webmaster 使用 `msvalidate.01`，通过 `verification.other` 注入。
 */
export function getSiteVerificationMetadata():
  | NonNullable<Metadata["verification"]>
  | undefined {
  if (!isPublicIndexingEnabled()) {
    return undefined;
  }

  const google = readEnv("GOOGLE_SITE_VERIFICATION");
  const bing = readEnv("BING_SITE_VERIFICATION");
  const parsedOther = parseOtherList(readEnv("OTHER_SITE_VERIFICATION"));

  const other: Record<string, string | number | (string | number)[]> = {};
  for (const [k, vals] of Object.entries(parsedOther)) {
    if (vals.length === 0) {
      continue;
    }
    other[k] = vals.length === 1 ? (vals[0] ?? "") : vals;
  }

  if (bing) {
    other["msvalidate.01"] = bing;
  }

  const result: NonNullable<Metadata["verification"]> = {};
  if (google) {
    result.google = google;
  }
  if (Object.keys(other).length > 0) {
    result.other = other;
  }

  if (!result.google && !result.other) {
    return undefined;
  }

  return result;
}
