import { execSync, spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = process.cwd();
const PORT = Number(
  process.env.B4_VERIFY_PORT ?? 4200 + Math.floor(Math.random() * 200)
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
  assert(!sitemap.includes("/admin/raw-documents/"), "sitemap 不应包含 raw 详情后台页");
  assert(!sitemap.includes("/admin/content-items"), "sitemap 不应包含 content-items 后台页");
  assert(!sitemap.includes("/api/normalize/run"), "sitemap 不应包含 normalize API");
}

async function verifyAdminDetailRouteIsProtected() {
  const res = await fetch(`${BASE_URL}/admin/raw-documents/sample-id`, {
    redirect: "manual",
  });
  assert(
    res.status === 307 ||
      res.status === 308 ||
      res.status === 302 ||
      res.status === 500,
    "admin raw 详情路由应受后台鉴权保护（重定向或未配置后台密钥时 500）"
  );
}

async function main() {
  const env = {
    DEPLOYMENT_ENV: "production",
    PUBLIC_INDEXING_OVERRIDE: "",
    ROBOTS_ALLOW_ALL: "true",
    DISABLE_PUBLIC_INDEXING: "",
    INGEST_WEBHOOK_SECRET: "b4-ingest-secret",
    NORMALIZE_WEBHOOK_SECRET: "b4-normalize-secret",
    RAW_BLOB_LOCAL_DIR: ".data/raw-blobs-test",
  };

  console.log("[B4-verify] build web...");
  run("pnpm --filter web build", env);

  console.log("[B4-verify] check admin detail isolation...");
  await withServer(env, async () => {
    await verifySitemapIsolation();
    await verifyAdminDetailRouteIsProtected();
  });

  console.log("[B4-verify] phase B4 checks passed");
}

main().catch((error) => {
  console.error("[B4-verify] failed:", error.message);
  process.exitCode = 1;
});
