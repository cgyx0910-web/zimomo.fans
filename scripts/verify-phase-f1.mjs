import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const mustExist = [
  "packages/db/src/schema/users.ts",
  "packages/db/drizzle/0015_quiet_leopardon.sql",
  "apps/web/lib/auth/user-constants.ts",
  "apps/web/lib/auth/user-token.ts",
  "apps/web/lib/auth/user-session.ts",
  "apps/web/lib/users/queries.ts",
  "apps/web/lib/users/validation.ts",
  "apps/web/actions/user-auth-actions.ts",
  "apps/web/app/account/layout.tsx",
  "apps/web/app/account/page.tsx",
  "apps/web/app/account/login/page.tsx",
  "apps/web/app/account/register/page.tsx",
  "apps/web/components/account/login-form.tsx",
  "apps/web/components/account/register-form.tsx",
];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assertIncludes(rel, needle, message) {
  const src = read(rel);
  if (!src.includes(needle)) {
    console.error(`[F1-verify] ${message}\n  file: ${rel}\n  missing: ${needle}`);
    process.exit(1);
  }
}

function assertNotIncludes(rel, needle, message) {
  const src = read(rel);
  if (src.includes(needle)) {
    console.error(`[F1-verify] ${message}\n  file: ${rel}\n  forbidden substring: ${needle}`);
    process.exit(1);
  }
}

function main() {
  const missing = [];
  for (const rel of mustExist) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) {
      missing.push(rel);
    }
  }
  if (missing.length) {
    console.error("[F1-verify] missing files:\n", missing.join("\n"));
    process.exit(1);
  }

  const userConstants = read("apps/web/lib/auth/user-constants.ts");
  if (!userConstants.includes('USER_SESSION_COOKIE = "guge_user"')) {
    console.error(
      '[F1-verify] apps/web/lib/auth/user-constants.ts must define USER_SESSION_COOKIE = "guge_user"'
    );
    process.exit(1);
  }

  const actions = read("apps/web/actions/user-auth-actions.ts");
  if (!actions.includes('path: "/"')) {
    console.error(
      '[F1-verify] user-auth-actions must set session cookie path: "/"'
    );
    process.exit(1);
  }
  if (!actions.includes("USER_JWT_SECRET")) {
    console.error(
      "[F1-verify] user-auth-actions must reference USER_JWT_SECRET"
    );
    process.exit(1);
  }

  assertIncludes(
    "apps/web/app/account/layout.tsx",
    "robots: { index: false, follow: false }",
    "account layout must set robots noindex"
  );

  assertNotIncludes(
    "apps/web/app/sitemap.ts",
    "/account",
    "sitemap must not submit /account URLs"
  );

  const migration = read("packages/db/drizzle/0015_quiet_leopardon.sql");
  if (!migration.includes('CREATE TABLE "users"')) {
    console.error("[F1-verify] migration must create users table");
    process.exit(1);
  }
  if (!migration.includes("users_email_unique_idx")) {
    console.error("[F1-verify] migration must create users email unique index");
    process.exit(1);
  }

  console.log("[F1-verify] key files and invariants OK");
}

main();
