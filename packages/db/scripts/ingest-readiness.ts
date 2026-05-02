import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { count, eq } from "drizzle-orm";

import { getDb, releasePool } from "../src/db";
import { articles, contentItems, rawDocuments, sources } from "../src/schema";

const scriptDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(scriptDir, "../.env") });
dotenv.config({ path: resolve(scriptDir, "../../..", ".env") });

process.env.DATABASE_URL ||= "postgresql://guge:guge@127.0.0.1:5432/guge";

async function main() {
  const db = getDb();

  const [activeSourcesRow] = await db
    .select({ n: count() })
    .from(sources)
    .where(eq(sources.isActive, true));
  const [totalSourcesRow] = await db.select({ n: count() }).from(sources);

  const [rawTotalRow] = await db.select({ n: count() }).from(rawDocuments);
  const [rawIngestedRow] = await db
    .select({ n: count() })
    .from(rawDocuments)
    .where(eq(rawDocuments.status, "ingested"));

  const [contentItemsRow] = await db.select({ n: count() }).from(contentItems);

  const [publishedArticlesRow] = await db
    .select({ n: count() })
    .from(articles)
    .where(eq(articles.status, "published"));

  const activeSources = Number(activeSourcesRow?.n ?? 0);
  const totalSources = Number(totalSourcesRow?.n ?? 0);
  const rawTotal = Number(rawTotalRow?.n ?? 0);
  const rawIngested = Number(rawIngestedRow?.n ?? 0);
  const contentItemsTotal = Number(contentItemsRow?.n ?? 0);
  const publishedArticles = Number(publishedArticlesRow?.n ?? 0);

  console.log("=== RSS 入库与前台资讯：数据库计数（ingest-readiness）===\n");
  console.log(`启用的 RSS 来源 (sources.is_active=true): ${activeSources}`);
  console.log(`RSS 来源总数: ${totalSources}`);
  console.log(`raw_documents 总数: ${rawTotal}（其中 status=ingested: ${rawIngested}）`);
  console.log(`content_items 总数: ${contentItemsTotal}`);
  console.log(`articles.status=published: ${publishedArticles}`);
  console.log("");

  if (activeSources === 0) {
    console.log(
      "提示：无启用中的来源。请到 /admin/sources 添加或启用 feed，否则 ingest 无事可做。"
    );
  } else if (rawTotal === 0) {
    console.log(
      "提示：有启用来源但 raw_documents 为空。请在 /admin/sources 点「立即执行 ingest」，或 POST /api/ingest/rss。"
    );
  }

  if (contentItemsTotal === 0 && rawTotal > 0) {
    console.log(
      "提示：已有 raw 但尚无 content_items。请在 /admin/sources 点「立即执行 normalize」（或等价 worker）。"
    );
  }

  if (publishedArticles === 0) {
    console.log(
      "说明：前台「资讯」列表只展示 articles 表中 published 且带 locale 的行；RSS 只写入 raw，不经人审不会自动 published。见 docs/INGEST_TO_PUBLISHED_PLAYBOOK.md。"
    );
  }

  console.log("\n完成。");
  await releasePool();
}

main().catch((err: unknown) => {
  console.error(err);
  void releasePool().finally(() => process.exit(1));
});
