import { and, desc, eq, isNull, ne, or, sql } from "drizzle-orm";

import { getDb } from "@guge/db";
import {
  articles,
  clusterItems,
  contentItems,
  sources,
  storyClusters,
  type ArticleWorkflowStatus,
} from "@guge/db/schema";

export type MergedClusterPublicMember = {
  contentItemId: string;
  title: string | null;
  sourceUrl: string | null;
  sourceName: string;
  publishedAt: Date | null;
  normalizedText: string;
  role: "primary" | "member" | "excluded";
};

export type MergedClusterPublishedArticle = {
  slug: string;
  canonicalUrl: string | null;
  title: string | null;
  status: ArticleWorkflowStatus;
};

export type MergedClusterPublic = {
  id: string;
  slug: string;
  title: string | null;
  summary: string | null;
  primaryContentItemId: string | null;
  publishedArticleId: string | null;
  updatedAt: Date;
  members: MergedClusterPublicMember[];
  publishedArticle: MergedClusterPublishedArticle | null;
};

export async function getMergedClusterBySlug(slug: string): Promise<MergedClusterPublic | null> {
  const db = getDb();
  const clusterRows = await db
    .select({
      id: storyClusters.id,
      slug: storyClusters.slug,
      title: storyClusters.title,
      summary: storyClusters.summary,
      status: storyClusters.status,
      primaryContentItemId: storyClusters.primaryContentItemId,
      publishedArticleId: storyClusters.publishedArticleId,
      updatedAt: storyClusters.updatedAt,
      pubSlug: articles.slug,
      pubCanonicalUrl: articles.canonicalUrl,
      pubTitle: articles.title,
      pubStatus: articles.status,
    })
    .from(storyClusters)
    .leftJoin(articles, eq(articles.id, storyClusters.publishedArticleId))
    .where(and(eq(storyClusters.slug, slug), eq(storyClusters.status, "merged")))
    .limit(1);

  const row = clusterRows[0];
  if (!row) {
    return null;
  }

  const memberRows = await db
    .select({
      contentItemId: contentItems.id,
      title: contentItems.title,
      sourceUrl: contentItems.sourceUrl,
      sourceName: sources.name,
      publishedAt: contentItems.publishedAt,
      normalizedText: contentItems.normalizedText,
      role: clusterItems.role,
    })
    .from(clusterItems)
    .innerJoin(contentItems, eq(contentItems.id, clusterItems.contentItemId))
    .innerJoin(sources, eq(sources.id, contentItems.sourceId))
    .where(and(eq(clusterItems.clusterId, row.id), ne(clusterItems.role, "excluded")))
    .orderBy(
      sql`${contentItems.publishedAt} desc nulls last`,
      desc(contentItems.updatedAt)
    );

  if (memberRows.length === 0) {
    return null;
  }

  const publishedArticle =
    row.publishedArticleId && row.pubSlug && row.pubStatus ?
      {
        slug: row.pubSlug,
        canonicalUrl: row.pubCanonicalUrl,
        title: row.pubTitle,
        status: row.pubStatus,
      }
    : null;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    primaryContentItemId: row.primaryContentItemId,
    publishedArticleId: row.publishedArticleId,
    updatedAt: row.updatedAt,
    members: memberRows.map((m) => ({
      contentItemId: m.contentItemId,
      title: m.title,
      sourceUrl: m.sourceUrl,
      sourceName: m.sourceName,
      publishedAt: m.publishedAt,
      normalizedText: m.normalizedText,
      role: m.role,
    })),
    publishedArticle,
  };
}

/** 全部 merged cluster slug（含主文已 published 的 Hub），供统计或其它用途 */
export async function listMergedClusterSlugs(limit = 200) {
  const db = getDb();
  return db
    .select({
      slug: storyClusters.slug,
      updatedAt: storyClusters.updatedAt,
    })
    .from(storyClusters)
    .where(eq(storyClusters.status, "merged"))
    .orderBy(desc(storyClusters.updatedAt))
    .limit(limit);
}

/**
 * sitemap 用：主文已 published 的 merged Hub 不再单独入站 URL（canonical 收敛到主文）。
 */
export async function listMergedClusterSlugsForSitemap(limit = 200) {
  const db = getDb();
  return db
    .select({
      slug: storyClusters.slug,
      updatedAt: storyClusters.updatedAt,
    })
    .from(storyClusters)
    .leftJoin(articles, eq(articles.id, storyClusters.publishedArticleId))
    .where(
      and(
        eq(storyClusters.status, "merged"),
        or(
          isNull(storyClusters.publishedArticleId),
          isNull(articles.id),
          ne(articles.status, "published")
        )
      )
    )
    .orderBy(desc(storyClusters.updatedAt))
    .limit(limit);
}

/** 已发布主文页展示「相关事件 Hub」反向内链 */
export async function getHubByPublishedArticleId(
  articleId: string
): Promise<{ slug: string; title: string | null } | null> {
  const db = getDb();
  const rows = await db
    .select({
      slug: storyClusters.slug,
      title: storyClusters.title,
    })
    .from(storyClusters)
    .where(and(eq(storyClusters.publishedArticleId, articleId), eq(storyClusters.status, "merged")))
    .limit(1);

  return rows[0] ?? null;
}
