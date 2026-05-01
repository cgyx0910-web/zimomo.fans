/**
 * C3 verify：在存在 DATABASE_URL 时由 verify-phase-c3.mjs 调用。
 */
import {
  getMergedClusterBySlug,
  listMergedClusterSlugs,
} from "../apps/web/lib/clusters/public-queries";

async function main() {
  const slugs = await listMergedClusterSlugs(5);
  if (!Array.isArray(slugs)) {
    throw new Error("listMergedClusterSlugs must return array");
  }
  const missing = await getMergedClusterBySlug("__missing_slug_c3__");
  if (missing !== null) {
    throw new Error("getMergedClusterBySlug should return null for missing slug");
  }
}

main()
  .then(() => {
    console.log("[c3-db-smoke] ok");
  })
  .catch((err: unknown) => {
    console.error("[c3-db-smoke] failed:", err);
    process.exitCode = 1;
  });
