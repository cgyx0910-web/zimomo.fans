import type { MetadataRoute } from "next";

import { listPublishedArticles } from "@/lib/articles/public-queries";
import { getSiteOrigin } from "@/lib/articles/site";
import { listMergedClusterSlugsForSitemap } from "@/lib/clusters/public-queries";
import { listPublishedCalendarEventsForSitemap } from "@/lib/calendar/public-queries";
import { listPublishedWikiEntitiesForSitemap } from "@/lib/wiki/public-queries";
import { isPublicIndexingEnabled } from "@/lib/seo/indexable";

/** 依赖运行时 `DISABLE_PUBLIC_INDEXING` 等，避免 build 阶段固化进静态 sitemap */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isPublicIndexingEnabled()) {
    return [];
  }

  const origin = getSiteOrigin();
  const stamp = new Date();

  const legalPaths = [
    "/about",
    "/advertising",
    "/disclaimer",
    "/privacy",
    "/cookies",
    "/copyright",
  ] as const;

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${origin}/`,
      lastModified: stamp,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${origin}/articles`,
      lastModified: stamp,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${origin}/calendar`,
      lastModified: stamp,
      changeFrequency: "weekly",
      priority: 0.68,
    },
    {
      url: `${origin}/wiki`,
      lastModified: stamp,
      changeFrequency: "weekly",
      priority: 0.69,
    },
    ...legalPaths.map((path) => ({
      url: `${origin}${path}`,
      lastModified: stamp,
      changeFrequency: "monthly" as const,
      priority: 0.45,
    })),
  ];

  try {
    const rows = await listPublishedArticles();

    const articleUrls: MetadataRoute.Sitemap = rows.map((article) => ({
      url: `${origin}/articles/${article.slug}`,
      lastModified:
        article.updatedAt instanceof Date ?
          article.updatedAt
        : new Date(article.updatedAt),
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    let clusterUrls: MetadataRoute.Sitemap = [];
    try {
      const clusters = await listMergedClusterSlugsForSitemap(200);
      clusterUrls = clusters.map((row) => ({
        url: `${origin}/clusters/${row.slug}`,
        lastModified:
          row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
        changeFrequency: "daily" as const,
        priority: 0.55,
      }));
    } catch {
      /* 无 DB 或查询失败时仅省略 cluster 条目 */
    }

    let calendarEventUrls: MetadataRoute.Sitemap = [];
    try {
      const calendarRows = await listPublishedCalendarEventsForSitemap();
      calendarEventUrls = calendarRows.map((row) => ({
        url: `${origin}/calendar/${row.slug}`,
        lastModified:
          row.updatedAt instanceof Date ?
            row.updatedAt
          : new Date(row.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.62,
      }));
    } catch {
      /* 无日历数据或 DB 不可用 */
    }

    let wikiEntityUrls: MetadataRoute.Sitemap = [];
    try {
      const wikiRows = await listPublishedWikiEntitiesForSitemap();
      wikiEntityUrls = wikiRows.map((row) => ({
        url: `${origin}/wiki/${row.slug}`,
        lastModified:
          row.updatedAt instanceof Date ?
            row.updatedAt
          : new Date(row.updatedAt),
        changeFrequency: "monthly" as const,
        priority: 0.64,
      }));
    } catch {
      /* 无百科或 DB */
    }

    return [
      ...staticEntries,
      ...articleUrls,
      ...clusterUrls,
      ...calendarEventUrls,
      ...wikiEntityUrls,
    ];
  } catch {
    /* 运行时或构建阶段无 DB 等情况：仍能返回站内基础 URL */
    return staticEntries;
  }
}
