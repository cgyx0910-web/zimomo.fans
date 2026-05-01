import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const mustExist = [
  "packages/db/src/schema/calendar_events.ts",
  "packages/db/drizzle/0012_nifty_roxanne_simpson.sql",
  "apps/web/actions/calendar-event-actions.ts",
  "apps/web/lib/calendar/public-queries.ts",
  "apps/web/lib/calendar/ics.ts",
  "apps/web/app/calendar/page.tsx",
  "apps/web/app/calendar/[slug]/page.tsx",
  "apps/web/app/calendar/feed/route.ts",
  "apps/web/app/admin/calendar-events/page.tsx",
  "apps/web/components/admin/calendar-event-form.tsx",
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
    console.error("[E1-verify] missing files:\n", missing.join("\n"));
    process.exit(1);
  }
  console.log("[E1-verify] key files present");
}

main();
