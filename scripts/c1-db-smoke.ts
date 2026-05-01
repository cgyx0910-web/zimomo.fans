/**
 * C1 verify：在存在 DATABASE_URL 时由 verify-phase-c1.mjs 调用，
 * 确认 listClustersAdmin 可执行（空表也应返回数组）。
 */
import { listClustersAdmin } from "../apps/web/lib/clusters/queries";

async function main() {
  const rows = await listClustersAdmin();
  if (!Array.isArray(rows)) {
    throw new Error("listClustersAdmin must return an array");
  }
}

main()
  .then(() => {
    console.log("[c1-db-smoke] ok");
  })
  .catch((err: unknown) => {
    console.error("[c1-db-smoke] failed:", err);
    process.exitCode = 1;
  });
