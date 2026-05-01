import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const mustExist = [
  "packages/db/src/schema/newsletter_subscriptions.ts",
  "packages/db/drizzle/0017_late_dark_phoenix.sql",
  "apps/web/lib/newsletter/constants.ts",
  "apps/web/lib/newsletter/tokens.ts",
  "apps/web/lib/newsletter/validation.ts",
  "apps/web/lib/newsletter/queries.ts",
  "apps/web/lib/newsletter/flows.ts",
  "apps/web/lib/newsletter/messages.ts",
  "apps/web/lib/email/transport.ts",
  "apps/web/lib/email/transports/console.ts",
  "apps/web/lib/email/transports/smtp.ts",
  "apps/web/actions/newsletter-actions.ts",
  "apps/web/actions/newsletter-admin-actions.ts",
  "apps/web/app/newsletter/layout.tsx",
  "apps/web/app/newsletter/page.tsx",
  "apps/web/app/newsletter/pending/page.tsx",
  "apps/web/app/newsletter/confirm/page.tsx",
  "apps/web/app/newsletter/unsubscribe/page.tsx",
  "apps/web/components/newsletter/subscribe-form.tsx",
  "apps/web/app/admin/newsletter/page.tsx",
  "docs/UTM_GUIDE.md",
];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assertIncludes(rel, needle, message) {
  const src = read(rel);
  if (!src.includes(needle)) {
    console.error(`[F3-verify] ${message}\n  file: ${rel}\n  missing: ${needle}`);
    process.exit(1);
  }
}

function assertNotIncludes(rel, needle, message) {
  const src = read(rel);
  if (src.includes(needle)) {
    console.error(`[F3-verify] ${message}\n  file: ${rel}\n  forbidden: ${needle}`);
    process.exit(1);
  }
}

function main() {
  const missing = [];
  for (const rel of mustExist) {
    if (!fs.existsSync(path.join(root, rel))) {
      missing.push(rel);
    }
  }
  if (missing.length) {
    console.error("[F3-verify] missing files:\n", missing.join("\n"));
    process.exit(1);
  }

  const migration = read("packages/db/drizzle/0017_late_dark_phoenix.sql");
  if (!migration.includes('CREATE TABLE "newsletter_subscriptions"')) {
    console.error("[F3-verify] migration must create newsletter_subscriptions");
    process.exit(1);
  }

  assertNotIncludes(
    "apps/web/app/sitemap.ts",
    "/newsletter",
    "sitemap must not submit newsletter URLs"
  );

  const robotsFiles = [
    "apps/web/app/newsletter/layout.tsx",
    "apps/web/app/newsletter/page.tsx",
    "apps/web/app/newsletter/pending/page.tsx",
    "apps/web/app/newsletter/confirm/page.tsx",
    "apps/web/app/newsletter/unsubscribe/page.tsx",
  ];
  for (const rel of robotsFiles) {
    assertIncludes(
      rel,
      "robots: { index: false, follow: false }",
      "newsletter routes must be noindex"
    );
  }

  assertIncludes(
    "apps/web/lib/email/transport.ts",
    "EMAIL_TRANSPORT",
    "transport must read EMAIL_TRANSPORT"
  );
  assertIncludes(
    "apps/web/lib/email/transport.ts",
    "console",
    "transport must support console mode"
  );

  assertIncludes(
    "apps/web/lib/newsletter/queries.ts",
    "confirmTokenHash",
    "queries must reference confirm token hash column"
  );
  assertIncludes(
    "apps/web/lib/newsletter/queries.ts",
    "unsubscribeTokenHash",
    "queries must reference unsubscribe token hash column"
  );

  assertIncludes(
    "apps/web/lib/newsletter/flows.ts",
    "getSiteOrigin",
    "newsletter links must use getSiteOrigin for absolute URLs"
  );

  assertNotIncludes(
    "apps/web/actions/newsletter-actions.ts",
    "llm-client",
    "newsletter actions must not import LLM client"
  );

  assertIncludes(
    "apps/web/actions/newsletter-admin-actions.ts",
    "assertAdminSession",
    "admin newsletter actions must require admin session"
  );

  assertIncludes(
    "apps/web/app/privacy/page.tsx",
    "Newsletter",
    "privacy page must mention Newsletter processing"
  );

  console.log("[F3-verify] key files and invariants OK");
}

main();
