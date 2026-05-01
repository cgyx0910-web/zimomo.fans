/**
 * D1 verify：纯逻辑（无外网），由 verify-phase-d1.mjs 在 build 后调用。
 */
import { computeSimhash64, hammingDistance64 } from "../apps/web/lib/clusters/simhash";
import { normalizeForSimhash } from "../apps/web/lib/quality-gate/normalize-text";
import {
  assertOutboundHttpsUrlSafe,
  QualityGateUrlError,
} from "../apps/web/lib/quality-gate/url-safety";

/** 与 `run-publish-gate` 中逻辑一致；脚本独立运行时不经 @/ 路径解析 */
function readQualityGateSimhashMaxDist(): number {
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

async function assertRejectsPrivateIpv4Literal() {
  try {
    await assertOutboundHttpsUrlSafe("https://192.168.1.1/path");
    throw new Error("expected QualityGateUrlError for 192.168.x.x");
  } catch (e: unknown) {
    if (!(e instanceof QualityGateUrlError)) {
      throw e;
    }
  }
}

async function assertRejectsLoopbackLiteral() {
  try {
    await assertOutboundHttpsUrlSafe("https://127.0.0.1/");
    throw new Error("expected QualityGateUrlError for 127.0.0.1");
  } catch (e: unknown) {
    if (!(e instanceof QualityGateUrlError)) {
      throw e;
    }
  }
}

async function assertRejectsUserinfo() {
  try {
    await assertOutboundHttpsUrlSafe("https://user:pass@example.com/");
    throw new Error("expected QualityGateUrlError for userinfo");
  } catch (e: unknown) {
    if (!(e instanceof QualityGateUrlError)) {
      throw e;
    }
  }
}

function assertIdenticalBodyIsWithinBlockThreshold() {
  const chunk = "alpha beta gamma delta epsilon zeta eta theta iota kappa ";
  const long = chunk.repeat(40);
  const a = normalizeForSimhash(long);
  const b = normalizeForSimhash(long);
  const ha = computeSimhash64(a);
  const hb = computeSimhash64(b);
  if (ha === null || hb === null) {
    throw new Error("simhash should be computable for long text");
  }
  const dist = hammingDistance64(ha, hb);
  if (dist !== 0) {
    throw new Error(`expected hamming 0 for identical text, got ${dist}`);
  }
  const maxDist = readQualityGateSimhashMaxDist();
  if (dist > maxDist) {
    throw new Error("identical text should be within block threshold (dist <= maxDist)");
  }
}

async function main() {
  await assertRejectsPrivateIpv4Literal();
  await assertRejectsLoopbackLiteral();
  await assertRejectsUserinfo();
  assertIdenticalBodyIsWithinBlockThreshold();
}

main()
  .then(() => {
    console.log("[d1-gate-smoke] ok");
  })
  .catch((err: unknown) => {
    console.error("[d1-gate-smoke] failed:", err);
    process.exitCode = 1;
  });
