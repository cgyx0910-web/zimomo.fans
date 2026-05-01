/**
 * F5：内存限流冒烟（由 f5-rate-limit-smoke.mjs 通过 tsx 调用）。
 */
import { checkRateLimit } from "../apps/web/lib/rate-limit/in-memory.ts";

const suffix = Math.random().toString(36).slice(2);
const bucketKey = `smoke:f5:${suffix}`;

const r1 = checkRateLimit({
  bucketKey,
  limit: 2,
  windowMs: 100,
  now: 1000,
});
if (!r1.allowed) {
  throw new Error("[f5-smoke] expected first hit allowed");
}

const r2 = checkRateLimit({
  bucketKey,
  limit: 2,
  windowMs: 100,
  now: 1000,
});
if (!r2.allowed) {
  throw new Error("[f5-smoke] expected second hit allowed");
}

const r3 = checkRateLimit({
  bucketKey,
  limit: 2,
  windowMs: 100,
  now: 1000,
});
if (r3.allowed) {
  throw new Error("[f5-smoke] expected third hit denied");
}

const r4 = checkRateLimit({
  bucketKey,
  limit: 2,
  windowMs: 100,
  now: 1101,
});
if (!r4.allowed) {
  throw new Error("[f5-smoke] expected window reset then allowed");
}

console.log("[f5-smoke] rate-limit in-memory OK");
