import { execSync, spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = process.cwd();
const PORT = Number(
  process.env.B3_VERIFY_PORT ?? 4000 + Math.floor(Math.random() * 200)
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

async function verifyNormalizeWebhook(secret, allowAuthorizedRun) {
  const noAuthRes = await fetch(`${BASE_URL}/api/normalize/run`, { method: "POST" });
  assert(noAuthRes.status === 401, "normalize webhook 未授权请求应返回 401");

  if (allowAuthorizedRun) {
    const okRes = await fetch(`${BASE_URL}/api/normalize/run`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
      },
    });
    assert(okRes.ok, "normalize webhook 已授权请求应成功");
    const summary = await okRes.json();
    assert(typeof summary.scannedCount === "number", "B3 summary 缺少 scannedCount");
    assert(typeof summary.successCount === "number", "B3 summary 缺少 successCount");
    assert(typeof summary.failedCount === "number", "B3 summary 缺少 failedCount");
  } else {
    console.log("[B3-verify] skip authorized normalize run (DATABASE_URL not set)");
  }
}

async function verifySitemapIsolation() {
  const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
  const sitemap = await sitemapRes.text();
  assert(!sitemap.includes("/admin/content-items"), "sitemap 不应包含 content-items 后台页");
  assert(!sitemap.includes("/api/normalize/run"), "sitemap 不应包含 normalize API");
}

async function main() {
  const env = {
    DEPLOYMENT_ENV: "production",
    PUBLIC_INDEXING_OVERRIDE: "",
    ROBOTS_ALLOW_ALL: "true",
    DISABLE_PUBLIC_INDEXING: "",
    INGEST_WEBHOOK_SECRET: "b3-ingest-secret",
    NORMALIZE_WEBHOOK_SECRET: "b3-normalize-secret",
    RAW_BLOB_LOCAL_DIR: ".data/raw-blobs-test",
  };

  console.log("[B3-verify] build web...");
  run("pnpm --filter web build", env);

  console.log("[B3-verify] check normalize webhook and sitemap isolation...");
  const allowAuthorizedRun = Boolean(process.env.DATABASE_URL);
  await withServer(env, async () => {
    await verifyNormalizeWebhook(env.NORMALIZE_WEBHOOK_SECRET, allowAuthorizedRun);
    await verifySitemapIsolation();
  });

  console.log("[B3-verify] phase B3 checks passed");
}

main().catch((error) => {
  console.error("[B3-verify] failed:", error.message);
  process.exitCode = 1;
});
