import { execSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const require = createRequire(import.meta.url);

const ROOT = process.cwd();
const PORT = Number(
  process.env.C1_VERIFY_PORT ?? 4300 + Math.floor(Math.random() * 200)
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
  assert(!sitemap.includes("/admin/clusters"), "sitemap 不应包含 clusters 后台页");
  assert(!sitemap.includes("/clusters/"), "sitemap 不应包含前台 /clusters/ 路径（C1 未开放）");
}

async function verifyAdminClustersProtected() {
  const res = await fetch(`${BASE_URL}/admin/clusters`, {
    redirect: "manual",
  });
  assert(
    res.status === 307 ||
      res.status === 308 ||
      res.status === 302 ||
      res.status === 500,
    "admin /admin/clusters 应受后台鉴权保护（重定向或未配置后台密钥时 500）"
  );
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
  throw new Error("Could not resolve tsx/cli (needed for C1 DB smoke)");
}

async function verifyDbQueryIfConfigured() {
  if (!process.env.DATABASE_URL) {
    console.log("[C1-verify] skip listClustersAdmin (DATABASE_URL not set)");
    return;
  }
  const scriptPath = resolve(ROOT, "scripts/c1-db-smoke.ts");
  const tsxCli = resolveTsxCli();
  run(`node "${tsxCli}" "${scriptPath}"`);
}

async function main() {
  const env = {
    DEPLOYMENT_ENV: "production",
    PUBLIC_INDEXING_OVERRIDE: "",
    ROBOTS_ALLOW_ALL: "true",
    DISABLE_PUBLIC_INDEXING: "",
    INGEST_WEBHOOK_SECRET: "c1-ingest-secret",
    NORMALIZE_WEBHOOK_SECRET: "c1-normalize-secret",
    RAW_BLOB_LOCAL_DIR: ".data/raw-blobs-test",
  };

  console.log("[C1-verify] build web...");
  run("pnpm --filter web build", env);

  console.log("[C1-verify] check sitemap isolation + admin clusters protection...");
  await withServer(env, async () => {
    await verifySitemapIsolation();
    await verifyAdminClustersProtected();
  });

  console.log("[C1-verify] optional DB smoke...");
  await verifyDbQueryIfConfigured();

  console.log("[C1-verify] phase C1 checks passed");
}

main().catch((error) => {
  console.error("[C1-verify] failed:", error.message);
  process.exitCode = 1;
});
