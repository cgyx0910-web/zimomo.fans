import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const mustExist = [
  "docs/RUNBOOK.md",
  "apps/web/lib/rate-limit/in-memory.ts",
  "apps/web/lib/rate-limit/index.ts",
  "apps/web/lib/rate-limit/request-ip.ts",
  "scripts/f5-rate-limit-smoke.mjs",
  "scripts/f5-rate-limit-smoke.ts",
];

const actionFiles = [
  "apps/web/actions/comment-actions.ts",
  "apps/web/actions/newsletter-actions.ts",
  "apps/web/actions/user-auth-actions.ts",
  "apps/web/actions/admin-auth-actions.ts",
];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function main() {
  for (const rel of mustExist) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) {
      console.error("[F5-verify] missing file:", rel);
      process.exit(1);
    }
  }

  const envExample = read(".env.example");
  if (!envExample.includes("RATE_LIMIT_DISABLED")) {
    console.error("[F5-verify] .env.example must document RATE_LIMIT_DISABLED");
    process.exit(1);
  }
  if (!envExample.includes("RATE_LIMIT_TRUSTED_HEADER")) {
    console.error("[F5-verify] .env.example must document RATE_LIMIT_TRUSTED_HEADER");
    process.exit(1);
  }

  for (const rel of actionFiles) {
    const src = read(rel);
    if (!src.includes("enforceRateLimit(")) {
      console.error(
        `[F5-verify] ${rel} must call enforceRateLimit(`
      );
      process.exit(1);
    }
  }

  const smoke = path.join(root, "scripts", "f5-rate-limit-smoke.mjs");
  const smokeRes = spawnSync(process.execPath, [smoke], {
    cwd: root,
    stdio: "inherit",
  });
  if (smokeRes.status !== 0) {
    console.error("[F5-verify] f5-rate-limit-smoke failed");
    process.exit(1);
  }

  console.log("[F5-verify] RUNBOOK + rate-limit + smoke OK");
}

main();
