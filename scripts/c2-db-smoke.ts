/**
 * C2 verify：在存在 DATABASE_URL 时由 verify-phase-c2.mjs 调用，
 * 确认 runClusterBucketBatch 可执行（空候选也应返回 summary）。
 */
import { runClusterBucketBatch } from "../apps/web/lib/clusters/bucket-worker";

async function main() {
  const summary = await runClusterBucketBatch(10);
  const keys = [
    "scannedCount",
    "joinedByUrlCount",
    "joinedBySimhashCount",
    "createdCount",
    "durationMs",
  ] as const;
  for (const k of keys) {
    if (typeof summary[k] !== "number") {
      throw new Error(`summary.${k} must be number`);
    }
  }
}

main()
  .then(() => {
    console.log("[c2-db-smoke] ok");
  })
  .catch((err: unknown) => {
    console.error("[c2-db-smoke] failed:", err);
    process.exitCode = 1;
  });
