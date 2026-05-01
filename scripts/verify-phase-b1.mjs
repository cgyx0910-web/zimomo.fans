import { execSync, spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = process.cwd();
const PORT = Number(
  process.env.B1_VERIFY_PORT ?? 3600 + Math.floor(Math.random() * 200)
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
      // wait until boot
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
        // process may already be gone
      }
    } else {
      child.kill("SIGTERM");
    }
    await sleep(800);
  }
}

async function verifyWebhookAndSitemap(secret, allowAuthorizedRun) {
  const noAuthRes = await fetch(`${BASE_URL}/api/ingest/rss`, { method: "POST" });
  assert(noAuthRes.status === 401, "webhook 未授权请求应返回 401");

  if (allowAuthorizedRun) {
    const okRes = await fetch(`${BASE_URL}/api/ingest/rss`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
      },
    });
    assert(okRes.ok, "webhook 已授权请求应成功");
    const summary = await okRes.json();
    assert(typeof summary.totalSources === "number", "ingest summary 缺少 totalSources");
    assert(
      typeof summary.successCount === "number",
      "ingest summary 缺少 successCount"
    );
    assert(typeof summary.failedCount === "number", "ingest summary 缺少 failedCount");
  } else {
    console.log("[B1-verify] skip authorized ingest run (DATABASE_URL not set)");
  }

  const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
  const sitemap = await sitemapRes.text();
  assert(!sitemap.includes("/admin/sources"), "sitemap 不应包含后台 URL");
  assert(!sitemap.includes("/api/ingest/rss"), "sitemap 不应包含 webhook URL");
}

async function main() {
  const env = {
    DEPLOYMENT_ENV: "production",
    PUBLIC_INDEXING_OVERRIDE: "",
    ROBOTS_ALLOW_ALL: "true",
    DISABLE_PUBLIC_INDEXING: "",
    INGEST_WEBHOOK_SECRET: "b1-test-secret",
  };

  console.log("[B1-verify] build web...");
  run("pnpm --filter web build", env);

  console.log("[B1-verify] check webhook auth and sitemap isolation...");
  const allowAuthorizedRun = Boolean(process.env.DATABASE_URL);
  await withServer(env, async () => {
    await verifyWebhookAndSitemap(env.INGEST_WEBHOOK_SECRET, allowAuthorizedRun);
  });

  console.log("[B1-verify] phase B1 checks passed");
}

main().catch((error) => {
  console.error("[B1-verify] failed:", error.message);
  process.exitCode = 1;
});
