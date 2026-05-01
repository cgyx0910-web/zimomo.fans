import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const mustExist = [
  "apps/web/lib/seo/site-verification.ts",
  "docs/SEARCH_CONSOLE_VERIFICATION.md",
];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assertIncludes(rel, needle, message) {
  const src = read(rel);
  if (!src.includes(needle)) {
    console.error(`[F4-verify] ${message}\n  file: ${rel}\n  missing: ${needle}`);
    process.exit(1);
  }
}

function main() {
  for (const rel of mustExist) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) {
      console.error("[F4-verify] missing file:", rel);
      process.exit(1);
    }
  }

  assertIncludes(
    "apps/web/app/layout.tsx",
    "getSiteVerificationMetadata",
    "root layout must wire site verification metadata"
  );

  const sv = read("apps/web/lib/seo/site-verification.ts");
  if (!sv.includes("isPublicIndexingEnabled")) {
    console.error(
      "[F4-verify] site-verification must gate on isPublicIndexingEnabled"
    );
    process.exit(1);
  }
  if (!sv.includes("msvalidate.01")) {
    console.error("[F4-verify] site-verification must include Bing meta key");
    process.exit(1);
  }

  const envExample = read(".env.example");
  if (!envExample.includes("GOOGLE_SITE_VERIFICATION")) {
    console.error("[F4-verify] .env.example must document GOOGLE_SITE_VERIFICATION");
    process.exit(1);
  }
  if (!envExample.includes("BING_SITE_VERIFICATION")) {
    console.error("[F4-verify] .env.example must document BING_SITE_VERIFICATION");
    process.exit(1);
  }

  const publicDir = path.join(root, "apps/web/public");
  if (fs.existsSync(publicDir)) {
    const files = fs.readdirSync(publicDir);
    const forbidden = files.filter((name) => {
      const lower = name.toLowerCase();
      if (/^google.*\.html$/i.test(name)) {
        return true;
      }
      if (lower === "bingsiteauth.xml") {
        return true;
      }
      if (/^yandex.*\.html$/i.test(name)) {
        return true;
      }
      return false;
    });
    if (forbidden.length) {
      console.error(
        "[F4-verify] apps/web/public must not contain search engine verification files:",
        forbidden.join(", ")
      );
      process.exit(1);
    }
  }

  console.log("[F4-verify] key files and invariants OK");
}

main();
