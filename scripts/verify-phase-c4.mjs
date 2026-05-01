import {
  assertAdminClusterDetailProtected,
  assertClusterSlug404,
  assertSitemapClusterIsolation,
  assertStagingSitemapEmpty,
  defaultVerifyPort,
  run,
  runTsxScript,
  withServer,
} from "./lib/verify-next-server.mjs";

const BASE_PORT = defaultVerifyPort("C4_VERIFY_PORT");

async function verifyDbSmokeIfConfigured() {
  if (!process.env.DATABASE_URL) {
    console.log("[C4-verify] skip public-queries smoke (DATABASE_URL not set)");
    return;
  }
  runTsxScript("scripts/c4-db-smoke.ts");
}

async function main() {
  const env = {
    DEPLOYMENT_ENV: "production",
    PUBLIC_INDEXING_OVERRIDE: "",
    ROBOTS_ALLOW_ALL: "true",
    DISABLE_PUBLIC_INDEXING: "",
    INGEST_WEBHOOK_SECRET: "c4-ingest-secret",
    NORMALIZE_WEBHOOK_SECRET: "c4-normalize-secret",
    CLUSTER_WEBHOOK_SECRET: "c4-cluster-secret",
    RAW_BLOB_LOCAL_DIR: ".data/raw-blobs-test",
  };

  console.log("[C4-verify] build web...");
  run("pnpm --filter web build", env);

  console.log("[C4-verify] check sitemap + cluster 404 + admin detail protection...");
  await withServer(BASE_PORT, env, async (baseUrl) => {
    await assertSitemapClusterIsolation(baseUrl);
    await assertClusterSlug404(baseUrl, "__nope_slug_c4__");
    await assertAdminClusterDetailProtected(baseUrl);
  });

  console.log("[C4-verify] check DISABLE_PUBLIC_INDEXING sitemap empty...");
  await withServer(
    BASE_PORT + 37,
    {
      ...env,
      DISABLE_PUBLIC_INDEXING: "true",
      ROBOTS_ALLOW_ALL: "",
    },
    async (baseUrl) => {
      await assertStagingSitemapEmpty(baseUrl);
    }
  );

  console.log("[C4-verify] optional DB smoke...");
  await verifyDbSmokeIfConfigured();

  console.log("[C4-verify] phase C4 checks passed");
}

main().catch((error) => {
  console.error("[C4-verify] failed:", error.message);
  process.exitCode = 1;
});
