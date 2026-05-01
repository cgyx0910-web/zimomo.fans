import { desc, eq, ilike, or } from "drizzle-orm";

import { articleTags, articles, tags } from "@guge/db/schema";
import { getDb } from "@guge/db";

export async function listArticlesAdmin() {
  const db = getDb();
  return db
    .select()
    .from(articles)
    .orderBy(desc(articles.updatedAt));
}

export async function getArticleById(id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(articles)
    .where(eq(articles.id, id))
    .limit(1);

  return rows[0] ?? null;
}

/** 供 cluster 编辑器关联「主文」：按标题/slug 模糊或最近更新 */
export async function searchArticlesForClusterAdmin(query: string, limit = 20) {
  const db = getDb();
  const q = query.trim();
  if (!q) {
    return db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        status: articles.status,
      })
      .from(articles)
      .orderBy(desc(articles.updatedAt))
      .limit(limit);
  }

  const pattern = `%${q.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  return db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      status: articles.status,
    })
    .from(articles)
    .where(or(ilike(articles.title, pattern), ilike(articles.slug, pattern)))
    .orderBy(desc(articles.updatedAt))
    .limit(limit);
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
