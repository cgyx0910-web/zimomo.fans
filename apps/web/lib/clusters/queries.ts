import { and, count, desc, eq, ilike, notExists, or, sql } from "drizzle-orm";

import { getDb } from "@guge/db";
import {
  articles,
  clusterItems,
  contentItems,
  sources,
  storyClusters,
  type ArticleWorkflowStatus,
} from "@guge/db/schema";

export async function listClustersAdmin(limit = 200) {
  const db = getDb();
  return db
    .select({
      id: storyClusters.id,
      slug: storyClusters.slug,
      title: storyClusters.title,
      summary: storyClusters.summary,
      status: storyClusters.status,
      primaryContentItemId: storyClusters.primaryContentItemId,
      createdAt: storyClusters.createdAt,
      updatedAt: storyClusters.updatedAt,
      itemCount: count(clusterItems.contentItemId),
    })
    .from(storyClusters)
    .leftJoin(clusterItems, eq(clusterItems.clusterId, storyClusters.id))
    .groupBy(storyClusters.id)
    .orderBy(desc(storyClusters.updatedAt))
    .limit(limit);
}

export type ClusterPublishedArticlePreview = {
  id: string;
  slug: string;
  title: string | null;
  status: ArticleWorkflowStatus;
};

export type ClusterAdminDetail = {
  id: string;
  slug: string;
  title: string | null;
  summary: string | null;
  status: "draft" | "merged" | "archived";
  primaryContentItemId: string | null;
  publishedArticleId: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedArticle: ClusterPublishedArticlePreview | null;
};

export async function getClusterByIdAdmin(id: string): Promise<ClusterAdminDetail | null> {
  const db = getDb();
  const rows = await db
    .select({
      id: storyClusters.id,
      slug: storyClusters.slug,
      title: storyClusters.title,
      summary: storyClusters.summary,
      status: storyClusters.status,
      primaryContentItemId: storyClusters.primaryContentItemId,
      publishedArticleId: storyClusters.publishedArticleId,
      createdAt: storyClusters.createdAt,
      updatedAt: storyClusters.updatedAt,
      pubId: articles.id,
      pubSlug: articles.slug,
      pubTitle: articles.title,
      pubStatus: articles.status,
    })
    .from(storyClusters)
    .leftJoin(articles, eq(articles.id, storyClusters.publishedArticleId))
    .where(eq(storyClusters.id, id))
    .limit(1);

  const r = rows[0];
  if (!r) {
    return null;
  }

  const publishedArticle =
    r.publishedArticleId && r.pubId && r.pubSlug && r.pubStatus ?
      {
        id: r.pubId,
        slug: r.pubSlug,
        title: r.pubTitle,
        status: r.pubStatus,
      }
    : null;

  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    status: r.status,
    primaryContentItemId: r.primaryContentItemId,
    publishedArticleId: r.publishedArticleId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    publishedArticle,
  };
}

export async function listClusterItemsAdmin(clusterId: string) {
  const db = getDb();
  return db
    .select({
      contentItemId: contentItems.id,
      role: clusterItems.role,
      note: clusterItems.note,
      title: contentItems.title,
      sourceUrl: contentItems.sourceUrl,
      publishedAt: contentItems.publishedAt,
      updatedAt: contentItems.updatedAt,
      sourceName: sources.name,
      normalizedText: contentItems.normalizedText,
    })
    .from(clusterItems)
    .innerJoin(contentItems, eq(contentItems.id, clusterItems.contentItemId))
    .innerJoin(sources, eq(sources.id, contentItems.sourceId))
    .where(eq(clusterItems.clusterId, clusterId))
    .orderBy(
      sql`${contentItems.publishedAt} desc nulls last`,
      desc(contentItems.updatedAt)
    );
}

export type ClusterMemberAdminRow = Awaited<
  ReturnType<typeof listClusterItemsAdmin>
>[number];

/** 未加入任何 cluster 的 ingested content_items，供「加入成员」搜索 */
export async function searchOrphanContentItemsAdmin(query: string, limit = 20) {
  const db = getDb();
  const q = query.trim();
  const orphanFilter = notExists(
    db.select({ x: sql`1` }).from(clusterItems).where(eq(clusterItems.contentItemId, contentItems.id))
  );

  const pattern = `%${q.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  const whereExpr =
    q ?
      and(
        eq(contentItems.status, "ingested"),
        orphanFilter,
        or(ilike(contentItems.title, pattern), ilike(contentItems.sourceUrl, pattern))
      )
    : and(eq(contentItems.status, "ingested"), orphanFilter);

  return db
    .select({
      id: contentItems.id,
      title: contentItems.title,
      sourceUrl: contentItems.sourceUrl,
      publishedAt: contentItems.publishedAt,
      updatedAt: contentItems.updatedAt,
      sourceName: sources.name,
    })
    .from(contentItems)
    .innerJoin(sources, eq(sources.id, contentItems.sourceId))
    .where(whereExpr)
    .orderBy(desc(contentItems.updatedAt))
    .limit(limit);
}
