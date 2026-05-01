import { assertOutboundHttpsUrlSafe, QualityGateUrlError } from "@/lib/quality-gate/url-safety";

const UA = "guge-quality-gate/1.0";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function readLenientUpstream5xx(): boolean {
  return process.env.QUALITY_GATE_LENIENT_UPSTREAM === "true";
}

function isTerminalStatusOk(status: number): boolean {
  if (status >= 200 && status < 300) {
    return true;
  }
  if (readLenientUpstream5xx() && status >= 500 && status < 600) {
    return true;
  }
  return false;
}

function isTerminalStatusHardFail(status: number): boolean {
  if (status === 401 || status === 403 || status === 404 || status === 410) {
    return true;
  }
  if (status >= 500 && status < 600 && !readLenientUpstream5xx()) {
    return true;
  }
  return false;
}

function parseRedirectLocation(base: URL, location: string | null): URL | null {
  if (!location?.trim()) {
    return null;
  }
  try {
    return new URL(location.trim(), base);
  } catch {
    return null;
  }
}

async function readResponseBodyWithLimit(
  res: Response,
  maxBytes: number,
  signal: AbortSignal
): Promise<Uint8Array> {
  if (!res.body) {
    return new Uint8Array();
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (!value?.length) {
        continue;
      }
      const next = total + value.length;
      if (next > maxBytes) {
        chunks.push(new Uint8Array(value.slice(0, maxBytes - total)));
        total = maxBytes;
        await reader.cancel();
        break;
      }
      chunks.push(new Uint8Array(value));
      total = next;
    }
  } finally {
    reader.releaseLock();
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return Uint8Array.from(out);
}

type HopResult = {
  status: number;
  location: string | null;
  bodySample: Uint8Array;
};

async function fetchHop(
  url: URL,
  method: "HEAD" | "GET",
  signal: AbortSignal,
  maxBytes: number
): Promise<HopResult> {
  await assertOutboundHttpsUrlSafe(url.toString());
  const res = await fetch(url.toString(), {
    method,
    redirect: "manual",
    signal,
    headers: {
      "User-Agent": UA,
      Accept:
        method === "HEAD" ?
          "*/*"
        : "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
    },
  });

  const location = res.headers.get("location");
  let bodySample = new Uint8Array();
  if (method === "GET" && res.body) {
    const raw = await readResponseBodyWithLimit(res, maxBytes, signal);
    bodySample = new Uint8Array(raw);
  } else if (res.body && method === "HEAD") {
    await res.body.cancel().catch(() => {});
  }

  return { status: res.status, location, bodySample };
}

export type ProbeResult =
  | { ok: true; status: number; finalUrl: string; bodySample: Uint8Array }
  | { ok: false; message: string };

type GetWithRedirectsResult =
  | { ok: true; status: number; finalUrl: string; bodySample: Uint8Array }
  | { ok: false; message: string };

/**
 * 跟随 HTTPS 重定向后以 GET 拉取正文片段（用于主来源可达性 + 雷同度），每跳 SSRF 校验。
 */
export async function fetchHttpsGetWithRedirects(
  rawUrl: string,
  options: { timeoutMs: number; maxBytes: number }
): Promise<GetWithRedirectsResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    let current = new URL(rawUrl);
    await assertOutboundHttpsUrlSafe(current.toString());
    const maxHops = 5;

    for (let hop = 0; hop <= maxHops; hop += 1) {
      let status: number;
      let location: string | null;
      let bodySample: Uint8Array;

      try {
        const get = await fetchHop(current, "GET", controller.signal, options.maxBytes);
        status = get.status;
        location = get.location;
        bodySample = get.bodySample;
      } catch (e: unknown) {
        if (e instanceof QualityGateUrlError) {
          return { ok: false, message: e.message };
        }
        const msg = e instanceof Error ? e.message : "网络错误";
        if (msg.includes("abort") || msg === "The operation was aborted.") {
          return { ok: false, message: "请求超时。" };
        }
        return { ok: false, message: `请求失败：${msg}` };
      }

      if (REDIRECT_STATUSES.has(status)) {
        const next = parseRedirectLocation(current, location);
        if (!next || next.protocol !== "https:") {
          return { ok: false, message: "重定向目标无效或非 HTTPS。" };
        }
        try {
          await assertOutboundHttpsUrlSafe(next.toString());
          current = next;
        } catch (e: unknown) {
          const m = e instanceof QualityGateUrlError ? e.message : "重定向被拒绝";
          return { ok: false, message: m };
        }
        continue;
      }

      if (isTerminalStatusHardFail(status)) {
        return {
          ok: false,
          message: `主来源返回 ${status}，无法作为已发布来源复核。`,
        };
      }
      if (!isTerminalStatusOk(status)) {
        return {
          ok: false,
          message: `主来源返回 ${status}，质检未通过。`,
        };
      }

      return { ok: true, status, finalUrl: current.toString(), bodySample };
    }

    return { ok: false, message: "重定向次数过多。" };
  } catch (e: unknown) {
    if (e instanceof QualityGateUrlError) {
      return { ok: false, message: e.message };
    }
    const msg = e instanceof Error ? e.message : "未知错误";
    return { ok: false, message: msg };
  } finally {
    clearTimeout(timer);
  }
}

function decodeBodySample(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

export function extractTextFromFetchedSample(bytes: Uint8Array): string {
  return decodeBodySample(bytes);
}

/**
 * 探测 URL：手动跟随重定向（每跳 SSRF 校验），HEAD 优先，405/501 时回退 GET（仅取前 maxBytes）。
 */
export async function probeOutboundUrl(
  rawUrl: string,
  options: { timeoutMs: number; maxBytes: number }
): Promise<ProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    let current = new URL(rawUrl);
    await assertOutboundHttpsUrlSafe(current.toString());

    const maxHops = 5;
    for (let hop = 0; hop <= maxHops; hop += 1) {
      let status: number;
      let location: string | null;
      let bodySample: Uint8Array;

      try {
        const head = await fetchHop(current, "HEAD", controller.signal, 0);
        status = head.status;
        location = head.location;
        bodySample = head.bodySample;

        if (status === 405 || status === 501) {
          const get = await fetchHop(current, "GET", controller.signal, options.maxBytes);
          status = get.status;
          location = get.location;
          bodySample = get.bodySample;
        }
      } catch (e: unknown) {
        if (e instanceof QualityGateUrlError) {
          return { ok: false, message: e.message };
        }
        const msg = e instanceof Error ? e.message : "网络错误";
        if (msg.includes("abort") || msg === "The operation was aborted.") {
          return { ok: false, message: "请求超时。" };
        }
        return { ok: false, message: `请求失败：${msg}` };
      }

      if (REDIRECT_STATUSES.has(status)) {
        const next = parseRedirectLocation(current, location);
        if (!next || next.protocol !== "https:") {
          return { ok: false, message: "重定向目标无效或非 HTTPS。" };
        }
        try {
          await assertOutboundHttpsUrlSafe(next.toString());
          current = next;
        } catch (e: unknown) {
          const m = e instanceof QualityGateUrlError ? e.message : "重定向被拒绝";
          return { ok: false, message: m };
        }
        continue;
      }

      if (isTerminalStatusHardFail(status)) {
        return {
          ok: false,
          message: `链接返回 ${status}，无法作为已发布来源复核。`,
        };
      }
      if (!isTerminalStatusOk(status)) {
        return {
          ok: false,
          message: `链接返回 ${status}，质检未通过。`,
        };
      }

      return { ok: true, status, finalUrl: current.toString(), bodySample };
    }

    return { ok: false, message: "重定向次数过多。" };
  } catch (e: unknown) {
    if (e instanceof QualityGateUrlError) {
      return { ok: false, message: e.message };
    }
    const msg = e instanceof Error ? e.message : "未知错误";
    return { ok: false, message: msg };
  } finally {
    clearTimeout(timer);
  }
}
