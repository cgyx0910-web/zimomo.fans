import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const mustExist = [
  "packages/db/src/schema/wiki_entities.ts",
  "packages/db/drizzle/0013_secret_ben_parker.sql",
  "apps/web/actions/wiki-entity-actions.ts",
  "apps/web/lib/wiki/public-queries.ts",
  "apps/web/components/wiki/wiki-entry-shell.tsx",
  "apps/web/app/wiki/page.tsx",
  "apps/web/app/wiki/[slug]/page.tsx",
  "apps/web/app/admin/wiki-entities/page.tsx",
  "apps/web/components/admin/wiki-entity-form.tsx",
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
    console.error("[E2-verify] missing files:\n", missing.join("\n"));
    process.exit(1);
  }
  console.log("[E2-verify] key files present");
}

main();
