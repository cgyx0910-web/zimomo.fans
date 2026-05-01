import { run, runTsxScript } from "./lib/verify-next-server.mjs";

async function main() {
  const env = {
    DEPLOYMENT_ENV: "production",
    PUBLIC_INDEXING_OVERRIDE: "",
    ROBOTS_ALLOW_ALL: "true",
    DISABLE_PUBLIC_INDEXING: "",
  };

  console.log("[D2-verify] build web...");
  run("pnpm --filter web build", env);

  console.log("[D2-verify] enrich draft smoke (local logic)...");
  runTsxScript("scripts/d2-enrich-smoke.ts");

  console.log("[D2-verify] phase D2 checks passed");
}

main().catch((error) => {
  console.error("[D2-verify] failed:", error.message);
  process.exitCode = 1;
});
