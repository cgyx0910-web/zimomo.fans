import dns from "node:dns/promises";
import net from "node:net";

/** 拒绝 URL 中的凭据段（常见 SSRF/滥用形态） */
export function assertNoUrlCredentials(url: URL): void {
  if (url.username || url.password) {
    throw new QualityGateUrlError("URL 不允许包含用户名或密码段。");
  }
}

export class QualityGateUrlError extends Error {
  readonly code = "QUALITY_GATE_URL";

  constructor(message: string) {
    super(message);
    this.name = "QualityGateUrlError";
  }
}

function isPrivateIpv4(octets: number[]): boolean {
  if (octets.length !== 4) {
    return true;
  }
  const [a, b] = octets;
  if (a === 10) {
    return true;
  }
  if (a === 127) {
    return true;
  }
  if (a === 0) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  return false;
}

/** 粗判 IPv6 字面量或解析结果是否不可对公网抓取 */
function isBlockedIpv6Literal(addr: string): boolean {
  const lower = addr.toLowerCase();
  if (lower === "::1" || lower.endsWith("::1")) {
    return true;
  }
  if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) {
    return true;
  }
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.slice("::ffff:".length);
    const parts = v4.split(".").map((x) => Number.parseInt(x, 10));
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      return isPrivateIpv4(parts);
    }
  }
  return false;
}

function assertLiteralHostAllowed(hostname: string): void {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) {
    throw new QualityGateUrlError("禁止访问 localhost。");
  }
  if (net.isIPv4(hostname)) {
    const parts = hostname.split(".").map((x) => Number.parseInt(x, 10));
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) {
      throw new QualityGateUrlError("无效的 IPv4 地址。");
    }
    if (isPrivateIpv4(parts)) {
      throw new QualityGateUrlError("禁止访问内网或保留 IPv4 地址。");
    }
    return;
  }
  if (net.isIPv6(hostname)) {
    if (isBlockedIpv6Literal(hostname)) {
      throw new QualityGateUrlError("禁止访问本地或保留 IPv6 地址。");
    }
  }
}

/**
 * 校验出站 https URL：协议、主机名、DNS 解析结果均须为公网可达目标。
 */
export async function assertOutboundHttpsUrlSafe(rawUrl: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new QualityGateUrlError("无效的 URL。");
  }
  if (u.protocol !== "https:") {
    throw new QualityGateUrlError("仅允许 HTTPS URL。");
  }
  assertNoUrlCredentials(u);

  const hostname = u.hostname;
  if (!hostname) {
    throw new QualityGateUrlError("缺少主机名。");
  }

  if (net.isIPv4(hostname) || net.isIPv6(hostname)) {
    assertLiteralHostAllowed(hostname);
    return u;
  }

  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost")) {
    throw new QualityGateUrlError("禁止访问 localhost。");
  }

  type DnsAddr = { address: string; family: number };
  let records: DnsAddr[];
  try {
    records = (await dns.lookup(hostname, { all: true })) as DnsAddr[];
  } catch {
    throw new QualityGateUrlError(`无法解析主机名：${hostname}`);
  }
  if (records.length === 0) {
    throw new QualityGateUrlError(`DNS 无结果：${hostname}`);
  }

  for (const r of records) {
    if (r.family === 4) {
      const parts = r.address.split(".").map((x: string) => Number.parseInt(x, 10));
      if (isPrivateIpv4(parts)) {
        throw new QualityGateUrlError("解析到内网或保留 IPv4，已拒绝。");
      }
    } else if (r.family === 6) {
      if (isBlockedIpv6Literal(r.address)) {
        throw new QualityGateUrlError("解析到本地或保留 IPv6，已拒绝。");
      }
    }
  }

  return u;
}
