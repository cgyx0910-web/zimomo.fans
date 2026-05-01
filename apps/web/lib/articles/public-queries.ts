import { and, desc, eq, sql } from "drizzle-orm";

import { articleTags, articles, tags } from "@guge/db/schema";
import { getDb } from "@guge/db";

/** 仅访客可见的 `published` 条目，按「发布时间优先、否则更新时间」倒序 */
export async function listPublishedArticles() {
  const db = getDb();
  const sortKey = sql`COALESCE(${articles.publishedAt}, ${articles.updatedAt})`;

  return db
    .select()
    .from(articles)
    .where(eq(articles.status, "published"))
    .orderBy(desc(sortKey));
}

export async function getPublishedArticleBySlug(slug: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(articles)
    .where(
      and(eq(articles.status, "published"), eq(articles.slug, slug))
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function listTagSlugsByArticleId(articleId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ slug: tags.slug })
    .from(articleTags)
    .innerJoin(tags, eq(tags.id, articleTags.tagId))
    .where(eq(articleTags.articleId, articleId))
    .orderBy(tags.slug);

  return rows.map((row) => row.slug);
}
