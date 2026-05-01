/**
 * C4 verify：在存在 DATABASE_URL 时由 verify-phase-c4.mjs 调用。
 */
import {
  getHubByPublishedArticleId,
  listMergedClusterSlugsForSitemap,
} from "../apps/web/lib/clusters/public-queries";

async function main() {
  const slugs = await listMergedClusterSlugsForSitemap(5);
  if (!Array.isArray(slugs)) {
    throw new Error("listMergedClusterSlugsForSitemap must return array");
  }
  const missing = await getHubByPublishedArticleId("00000000-0000-4000-8000-000000000001");
  if (missing !== null) {
    throw new Error("getHubByPublishedArticleId should return null for missing article id");
  }
}

main()
  .then(() => {
    console.log("[c4-db-smoke] ok");
  })
  .catch((err: unknown) => {
    console.error("[c4-db-smoke] failed:", err);
    process.exitCode = 1;
  });
