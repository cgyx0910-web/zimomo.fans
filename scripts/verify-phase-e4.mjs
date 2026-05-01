import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const mustExist = [
  "apps/web/lib/ads/constants.ts",
  "apps/web/components/ads/ad-slot.tsx",
  "apps/web/components/ads/affiliate-disclosure-short.tsx",
  "apps/web/app/advertising/page.tsx",
];

function main() {
  const missing = [];
  for (const rel of mustExist) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) {
      missing.push(rel);
    }
  }

  const sitemapPath = path.join(root, "apps/web/app/sitemap.ts");
  const sitemapSrc = fs.readFileSync(sitemapPath, "utf8");
  if (!sitemapSrc.includes('"/advertising"')) {
    missing.push("apps/web/app/sitemap.ts (legalPaths must include /advertising)");
  }

  if (missing.length) {
    console.error("[E4-verify] missing or incomplete:\n", missing.join("\n"));
    process.exit(1);
  }
  console.log("[E4-verify] key files and sitemap path present");
}

main();
