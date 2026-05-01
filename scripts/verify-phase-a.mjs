import { execSync, spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = process.cwd();
const PORT = Number(process.env.A_VERIFY_PORT ?? 3300 + Math.floor(Math.random() * 200));
const BASE_URL = `http://127.0.0.1:${PORT}`;
function run(command, extraEnv = {}) {
  execSync(command, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
}

async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const res = await fetch(`${BASE_URL}/robots.txt`);
      if (res.ok) {
        return;
      }
    } catch {
      // ignore until server is up
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
        // ignore: process may have already exited
      }
    } else {
      child.kill("SIGTERM");
    }
    await sleep(800);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function verifyProductionIndexing() {
  const robotsRes = await fetch(`${BASE_URL}/robots.txt`);
  const robots = await robotsRes.text();
  assert(robots.includes("Allow: /"), "production robots.txt 必须允许抓取");
  assert(robots.includes("/sitemap.xml"), "production robots.txt 必须包含 sitemap");
}

async function verifyStagingNoIndexing() {
  const robotsRes = await fetch(`${BASE_URL}/robots.txt`);
  const robots = await robotsRes.text();
  assert(robots.includes("Disallow: /"), "staging robots.txt 必须全站 disallow");
  assert(!robots.includes("/sitemap.xml"), "staging robots.txt 不应暴露 sitemap");

  const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
  const sitemap = await sitemapRes.text();
  assert(!sitemap.includes("<loc>"), "staging sitemap 不应包含 URL 条目");

  const homeRes = await fetch(`${BASE_URL}/`);
  const xRobotsTag = homeRes.headers.get("x-robots-tag") ?? "";
  assert(
    xRobotsTag.toLowerCase().includes("noindex"),
    "staging 首页应返回 X-Robots-Tag: noindex"
  );
}

async function main() {
  console.log("[A-verify] check production indexing behavior...");
  const productionEnv = {
    DEPLOYMENT_ENV: "production",
    PUBLIC_INDEXING_OVERRIDE: "",
    ROBOTS_ALLOW_ALL: "true",
    DISABLE_PUBLIC_INDEXING: "",
  };
  run("pnpm --filter web build", productionEnv);
  await withServer(productionEnv, verifyProductionIndexing);

  console.log("[A-verify] check staging noindex behavior...");
  const stagingEnv = {
    DEPLOYMENT_ENV: "staging",
    PUBLIC_INDEXING_OVERRIDE: "",
    ROBOTS_ALLOW_ALL: "true",
    DISABLE_PUBLIC_INDEXING: "",
  };
  run("pnpm --filter web build", stagingEnv);
  await withServer(stagingEnv, verifyStagingNoIndexing);

  console.log("[A-verify] phase A checks passed");
}

main().catch((error) => {
  console.error("[A-verify] failed:", error.message);
  process.exitCode = 1;
});
