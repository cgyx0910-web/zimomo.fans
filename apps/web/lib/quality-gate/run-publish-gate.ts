import { getSiteOrigin } from "@/lib/articles/site";
import {
  extractTextFromFetchedSample,
  fetchHttpsGetWithRedirects,
  probeOutboundUrl,
} from "@/lib/quality-gate/fetch-probe";
import { normalizeForSimhash } from "@/lib/quality-gate/normalize-text";
import { computeSimhash64, hammingDistance64 } from "@/lib/clusters/simhash";

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_BYTES = 262_144;
const MAX_UNIQUE_URLS_TOTAL = 8;
const MAX_URLS_FROM_BODY = 7;

export type ArticlePublishGatePayload = {
  slug: string;
  articleId?: string;
  primarySourceUrl: string;
  body: string;
  canonicalUrl: string;
};

export type ArticlePublishGateResult =
  | { ok: true; bypassedByOverride: boolean }
  | { ok: false; fieldErrors: Record<string, string> };

function readTimeoutMs(): number {
  const raw = process.env.QUALITY_GATE_FETCH_TIMEOUT_MS?.trim();
  if (!raw) {
    return DEFAULT_TIMEOUT_MS;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1000 || n > 120_000) {
    return DEFAULT_TIMEOUT_MS;
  }
  return n;
}

export function readQualityGateSimhashMaxDist(): number {
  const raw = process.env.QUALITY_GATE_SIMHASH_MAX_DIST?.trim();
  if (!raw) {
    return 3;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0 || n > 64) {
    return 3;
  }
  return n;
}

function isGateDisabled(): boolean {
  return process.env.QUALITY_GATE_DISABLED === "true";
}

function shouldSkipGateForOverride(
  formData: FormData | undefined,
  slug: string,
  articleId: string | undefined
): boolean {
  const secret = process.env.QUALITY_GATE_OVERRIDE_SECRET?.trim();
  if (!formData || !secret) {
    return false;
  }
  const ov = String(formData.get("quality_gate_override") ?? "").trim() === "1";
  const submitted = String(formData.get("quality_gate_override_secret") ?? "").trim();
  if (ov && submitted === secret) {
    console.warn(
      JSON.stringify({
        event: "quality_gate_override",
        slug,
        articleId: articleId ?? null,
      })
    );
    return true;
  }
  return false;
}

function siteHostname(): string | null {
  try {
    return new URL(getSiteOrigin()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function canonicalHostname(canonicalUrl: string): string | null {
  try {
    return new URL(canonicalUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function shouldSkipBodyUrl(urlStr: string, canonicalUrl: string): boolean {
  let host: string;
  try {
    host = new URL(urlStr).hostname.toLowerCase();
  } catch {
    return true;
  }
  const site = siteHostname();
  const can = canonicalHostname(canonicalUrl);
  if (site && host === site) {
    return true;
  }
  if (can && host === can) {
    return true;
  }
  return false;
}

function extractHttpsUrlsFromBody(body: string, max: number): string[] {
  const re = /https:\/\/[^\s<>"']+/gi;
  const found = body.match(re) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of found) {
    const trimmed = raw.replace(/[).,;:\]}>'"]+$/, "");
    try {
      const u = new URL(trimmed);
      if (u.protocol !== "https:") {
        continue;
      }
      const key = u.toString();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push(trimmed);
      if (out.length >= max) {
        break;
      }
    } catch {
      continue;
    }
  }
  return out;
}

function buildUrlProbeList(
  primarySourceUrl: string,
  body: string,
  canonicalUrl: string
): string[] {
  const primary = primarySourceUrl.trim();
  const ordered: string[] = [];
  const seen = new Set<string>();

  const push = (u: string) => {
    const t = u.trim();
    if (!t || seen.has(t)) {
      return;
    }
    seen.add(t);
    ordered.push(t);
  };

  push(primary);

  const fromBody = extractHttpsUrlsFromBody(body, MAX_URLS_FROM_BODY);
  for (const u of fromBody) {
    if (u === primary) {
      continue;
    }
    if (shouldSkipBodyUrl(u, canonicalUrl)) {
      continue;
    }
    push(u);
    if (ordered.length >= MAX_UNIQUE_URLS_TOTAL) {
      break;
    }
  }

  return ordered;
}

/**
 * 发布为 `published` 前的质量闸门：出站链接可达性、正文与主来源摘录 simhash 雷同拦截。
 */
export async function runArticlePublishQualityGate(
  parsed: ArticlePublishGatePayload,
  formData?: FormData
): Promise<ArticlePublishGateResult> {
  if (isGateDisabled()) {
    return { ok: true, bypassedByOverride: false };
  }
  if (shouldSkipGateForOverride(formData, parsed.slug, parsed.articleId)) {
    return { ok: true, bypassedByOverride: true };
  }

  const timeoutMs = readTimeoutMs();
  const maxBytes = DEFAULT_MAX_BYTES;
  const fetchOpts = { timeoutMs, maxBytes };

  const primary = parsed.primarySourceUrl.trim();
  const primaryFetch = await fetchHttpsGetWithRedirects(primary, fetchOpts);
  if (!primaryFetch.ok) {
    return {
      ok: false,
      fieldErrors: {
        primary_source_url: primaryFetch.message,
      },
    };
  }

  const simArticle = normalizeForSimhash(parsed.body);
  const simSource = normalizeForSimhash(
    extractTextFromFetchedSample(primaryFetch.bodySample)
  );
  const hArticle = computeSimhash64(simArticle);
  const hSource = computeSimhash64(simSource);
  if (hArticle !== null && hSource !== null) {
    const dist = hammingDistance64(hArticle, hSource);
    const maxDist = readQualityGateSimhashMaxDist();
    if (dist <= maxDist) {
      return {
        ok: false,
        fieldErrors: {
          body: `正文与主来源网页摘录过于雷同（simhash 汉明距离 ${dist}，阈值 ≤ ${maxDist} 视为拦截）。请加入独立编辑内容后再发布。`,
        },
      };
    }
  }

  const urls = buildUrlProbeList(parsed.primarySourceUrl, parsed.body, parsed.canonicalUrl);

  for (const url of urls) {
    if (url === primary) {
      continue;
    }
    const probed = await probeOutboundUrl(url, fetchOpts);
    if (!probed.ok) {
      return {
        ok: false,
        fieldErrors: {
          body: `正文中的链接无法通过质检：${url} — ${probed.message}`,
        },
      };
    }
  }

  return { ok: true, bypassedByOverride: false };
}
