import { run, runTsxScript } from "./lib/verify-next-server.mjs";

async function main() {
  const env = {
    DEPLOYMENT_ENV: "production",
    PUBLIC_INDEXING_OVERRIDE: "",
    ROBOTS_ALLOW_ALL: "true",
    DISABLE_PUBLIC_INDEXING: "",
  };

  console.log("[D1-verify] build web...");
  run("pnpm --filter web build", env);

  console.log("[D1-verify] quality_gate smoke (local logic)...");
  runTsxScript("scripts/d1-gate-smoke.ts");

  console.log("[D1-verify] phase D1 checks passed");
}

main().catch((error) => {
  console.error("[D1-verify] failed:", error.message);
  process.exitCode = 1;
});
