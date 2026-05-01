import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const mustExist = [
  "packages/db/src/schema/editorial_faq.ts",
  "packages/db/drizzle/0014_adorable_korg.sql",
  "apps/web/lib/faq/editorial-faq.ts",
  "apps/web/lib/faq/faq-page-json-ld.ts",
  "apps/web/components/faq/editorial-faq.tsx",
];

function main() {
  const missing = [];
  for (const rel of mustExist) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) {
      missing.push(rel);
    }
  }
  if (missing.length) {
    console.error("[E3-verify] missing files:\n", missing.join("\n"));
    process.exit(1);
  }
  console.log("[E3-verify] key files present");
}

main();
