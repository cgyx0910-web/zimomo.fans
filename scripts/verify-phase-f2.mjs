import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const mustExist = [
  "packages/db/src/schema/article_comments.ts",
  "packages/db/drizzle/0016_medical_triathlon.sql",
  "apps/web/lib/comments/spam.ts",
  "apps/web/lib/comments/queries.ts",
  "apps/web/actions/comment-actions.ts",
  "apps/web/actions/comment-moderation-actions.ts",
  "apps/web/components/comments/article-comments-section.tsx",
  "apps/web/components/comments/article-comment-composer.tsx",
  "apps/web/app/admin/comments/page.tsx",
];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assertIncludes(rel, needle, message) {
  const src = read(rel);
  if (!src.includes(needle)) {
    console.error(`[F2-verify] ${message}\n  file: ${rel}\n  missing: ${needle}`);
    process.exit(1);
  }
}

function assertNotIncludes(rel, needle, message) {
  const src = read(rel);
  if (src.includes(needle)) {
    console.error(`[F2-verify] ${message}\n  file: ${rel}\n  forbidden: ${needle}`);
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
    console.error("[F2-verify] missing files:\n", missing.join("\n"));
    process.exit(1);
  }

  const migration = read("packages/db/drizzle/0016_medical_triathlon.sql");
  if (!migration.includes('CREATE TABLE "article_comments"')) {
    console.error("[F2-verify] migration must create article_comments");
    process.exit(1);
  }
  if (!migration.includes("spam_blocked")) {
    console.error("[F2-verify] migration enum must include spam_blocked");
    process.exit(1);
  }

  assertIncludes(
    "apps/web/actions/comment-actions.ts",
    "getCurrentUser",
    "public submit must authenticate real users"
  );
  assertNotIncludes(
    "apps/web/actions/comment-actions.ts",
    "llm-client",
    "comment submit must not import LLM client"
  );
  assertNotIncludes(
    "apps/web/actions/comment-actions.ts",
    "enrich",
    "comment submit must not import enrich helper"
  );

  assertIncludes(
    "apps/web/actions/comment-moderation-actions.ts",
    "assertAdminSession",
    "moderation must require admin session"
  );

  assertIncludes(
    "apps/web/app/articles/[slug]/page.tsx",
    "ArticleCommentsSection",
    "article detail must embed comments section"
  );

  assertIncludes(
    "apps/web/app/sitemap.ts",
    "/advertising",
    "unchanged sanity: legal sitemap path must remain"
  );

  console.log("[F2-verify] key files and invariants OK");
}

main();
