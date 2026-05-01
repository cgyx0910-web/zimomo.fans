import { run, runTsxScript } from "./lib/verify-next-server.mjs";

async function main() {
  const env = {
    DEPLOYMENT_ENV: "production",
    PUBLIC_INDEXING_OVERRIDE: "",
    ROBOTS_ALLOW_ALL: "true",
    DISABLE_PUBLIC_INDEXING: "",
  };

  console.log("[D3-verify] build web...");
  run("pnpm --filter web build", env);

  console.log("[D3-verify] article workflow smoke...");
  runTsxScript("scripts/d3-workflow-smoke.ts");

  console.log("[D3-verify] phase D3 checks passed");
}

main().catch((error) => {
  console.error("[D3-verify] failed:", error.message);
  process.exitCode = 1;
});
