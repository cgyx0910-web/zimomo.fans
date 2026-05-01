import { execSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const require = createRequire(import.meta.url);

const ROOT = process.cwd();
const PORT = Number(
  process.env.C2_VERIFY_PORT ?? 4400 + Math.floor(Math.random() * 200)
);
const BASE_URL = `http://127.0.0.1:${PORT}`;

function run(command, extraEnv = {}) {
  execSync(command, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const res = await fetch(`${BASE_URL}/robots.txt`);
      if (res.ok) {
        return;
      }
    } catch {
      // wait for boot
    }
    await sleep(500);
  }
  throw new Error("next start did not become ready in time");
}

async function withServer(envOverrides, checkFn) {
  const child = spawn(`pnpm --filter web start -p ${PORT}`, {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...envOverrides },
  });

  try {
    await waitForServer();
    await checkFn();
  } finally {
    if (process.platform === "win32") {
      try {
        execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: "ignore" });
      } catch {
        // ignore
      }
    } else {
      child.kill("SIGTERM");
    }
    await sleep(800);
  }
}

async function verifySitemapIsolation() {
  const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
  const sitemap = await sitemapRes.text();
  assert(!sitemap.includes("/api/cluster/run"), "sitemap 不应包含 cluster API");
  assert(!sitemap.includes("/admin/clusters"), "sitemap 不应包含 clusters 后台页");
  assert(!sitemap.includes("/clusters/"), "sitemap 不应包含前台 /clusters/ 路径（C2 未开放）");
}

async function verifyClusterWebhook(secret, allowAuthorizedRun) {
  const noAuthRes = await fetch(`${BASE_URL}/api/cluster/run`, { method: "POST" });
  assert(noAuthRes.status === 401, "cluster webhook 未授权请求应返回 401");

  if (allowAuthorizedRun) {
    const okRes = await fetch(`${BASE_URL}/api/cluster/run`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
      },
    });
    assert(okRes.ok, "cluster webhook 已授权请求应成功");
    const summary = await okRes.json();
    assert(typeof summary.scannedCount === "number", "C2 summary 缺少 scannedCount");
    assert(typeof summary.joinedByUrlCount === "number", "C2 summary 缺少 joinedByUrlCount");
    assert(typeof summary.joinedBySimhashCount === "number", "C2 summary 缺少 joinedBySimhashCount");
    assert(typeof summary.createdCount === "number", "C2 summary 缺少 createdCount");
    assert(typeof summary.durationMs === "number", "C2 summary 缺少 durationMs");
  } else {
    console.log("[C2-verify] skip authorized cluster run (DATABASE_URL not set)");
  }
}

function resolveTsxCli() {
  const searchRoots = [ROOT, resolve(ROOT, "packages/db")];
  for (const root of searchRoots) {
    try {
      return require.resolve("tsx/cli", { paths: [root] });
    } catch {
      // try next root
    }
  }
  throw new Error("Could not resolve tsx/cli (needed for C2 DB smoke)");
}

async function verifyDbSmokeIfConfigured() {
  if (!process.env.DATABASE_URL) {
    console.log("[C2-verify] skip runClusterBucketBatch (DATABASE_URL not set)");
    return;
  }
  const scriptPath = resolve(ROOT, "scripts/c2-db-smoke.ts");
  const tsxCli = resolveTsxCli();
  run(`node "${tsxCli}" "${scriptPath}"`);
}

async function main() {
  const env = {
    DEPLOYMENT_ENV: "production",
    PUBLIC_INDEXING_OVERRIDE: "",
    ROBOTS_ALLOW_ALL: "true",
    DISABLE_PUBLIC_INDEXING: "",
    INGEST_WEBHOOK_SECRET: "c2-ingest-secret",
    NORMALIZE_WEBHOOK_SECRET: "c2-normalize-secret",
    CLUSTER_WEBHOOK_SECRET: "c2-cluster-secret",
    RAW_BLOB_LOCAL_DIR: ".data/raw-blobs-test",
  };

  console.log("[C2-verify] build web...");
  run("pnpm --filter web build", env);

  console.log("[C2-verify] check cluster webhook + sitemap isolation...");
  const allowAuthorizedRun = Boolean(process.env.DATABASE_URL);
  await withServer(env, async () => {
    await verifySitemapIsolation();
    await verifyClusterWebhook(env.CLUSTER_WEBHOOK_SECRET, allowAuthorizedRun);
  });

  console.log("[C2-verify] optional DB smoke...");
  await verifyDbSmokeIfConfigured();

  console.log("[C2-verify] phase C2 checks passed");
}

main().catch((error) => {
  console.error("[C2-verify] failed:", error.message);
  process.exitCode = 1;
});
