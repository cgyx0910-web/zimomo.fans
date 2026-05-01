import { execSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const require = createRequire(import.meta.url);

const ROOT = process.cwd();

export function getRepoRoot() {
  return ROOT;
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function run(command, extraEnv = {}) {
  execSync(command, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
}

/** @param {string} envName 如 C3_VERIFY_PORT；未设置时在 [base, base+span) 随机 */
export function defaultVerifyPort(envName, base = 4500, span = 200) {
  const raw = process.env[envName];
  if (raw !== undefined && raw !== "") {
    return Number(raw);
  }
  return base + Math.floor(Math.random() * span);
}

export async function waitForServer(baseUrl, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const res = await fetch(`${baseUrl}/robots.txt`);
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

export async function withServer(port, envOverrides, checkFn) {
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(`pnpm --filter web start -p ${port}`, {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...envOverrides },
  });

  try {
    await waitForServer(baseUrl);
    await checkFn(baseUrl);
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

export async function assertSitemapClusterIsolation(baseUrl) {
  const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`);
  const sitemap = await sitemapRes.text();
  assert(!sitemap.includes("/admin/clusters/"), "sitemap 不应包含后台 clusters 路径");
  assert(!sitemap.includes("/api/cluster/run"), "sitemap 不应包含 cluster API");
}

export async function assertClusterSlug404(baseUrl, notFoundSlug) {
  const res = await fetch(`${baseUrl}/clusters/${notFoundSlug}`);
  assert(res.status === 404, "未知 cluster slug 应返回 404");
}

export const DEFAULT_ADMIN_TEST_CLUSTER_ID = "00000000-0000-4000-8000-000000000001";

export async function assertAdminClusterDetailProtected(
  baseUrl,
  clusterId = DEFAULT_ADMIN_TEST_CLUSTER_ID
) {
  const res = await fetch(`${baseUrl}/admin/clusters/${clusterId}`, {
    redirect: "manual",
  });
  assert(
    res.status === 307 ||
      res.status === 308 ||
      res.status === 302 ||
      res.status === 500,
    "admin /admin/clusters/[id] 应受鉴权保护"
  );
}

export async function assertStagingSitemapEmpty(baseUrl) {
  const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`);
  const sitemap = await sitemapRes.text();
  assert(!sitemap.includes("<loc>"), "DISABLE_PUBLIC_INDEXING 时 sitemap 不应包含 URL 条目");
}

export function resolveTsxCli() {
  const searchRoots = [ROOT, resolve(ROOT, "packages/db")];
  for (const root of searchRoots) {
    try {
      return require.resolve("tsx/cli", { paths: [root] });
    } catch {
      // try next root
    }
  }
  throw new Error("Could not resolve tsx/cli (needed for DB smoke scripts)");
}

/** @param {string} relativePathFromRoot 如 scripts/c3-db-smoke.ts */
export function runTsxScript(relativePathFromRoot) {
  const scriptPath = resolve(ROOT, relativePathFromRoot);
  const tsxCli = resolveTsxCli();
  run(`node "${tsxCli}" "${scriptPath}"`);
}
