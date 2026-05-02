import type { MetadataRoute } from "next";

import { listPublishedArticles } from "@/lib/articles/public-queries";
import { getSiteOrigin } from "@/lib/articles/site";
import { listMergedClusterSlugsForSitemap } from "@/lib/clusters/public-queries";
import { listPublishedCalendarEventsForSitemap } from "@/lib/calendar/public-queries";
import { listPublishedWikiEntitiesForSitemap } from "@/lib/wiki/public-queries";
import { defaultLocale, locales } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/paths";
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

  const staticEntries: MetadataRoute.Sitemap = [];

  for (const loc of locales) {
    staticEntries.push(
      {
        url: `${origin}${localePath(loc, "/")}`,
        lastModified: stamp,
        changeFrequency: "weekly",
        priority: 0.9,
      },
      {
        url: `${origin}${localePath(loc, "/articles")}`,
        lastModified: stamp,
        changeFrequency: "daily",
        priority: 0.8,
      },
      {
        url: `${origin}${localePath(loc, "/calendar")}`,
        lastModified: stamp,
        changeFrequency: "weekly",
        priority: 0.68,
      },
      {
        url: `${origin}${localePath(loc, "/wiki")}`,
        lastModified: stamp,
        changeFrequency: "weekly",
        priority: 0.69,
      },
      ...legalPaths.map((path) => ({
        url: `${origin}${localePath(loc, path)}`,
        lastModified: stamp,
        changeFrequency: "monthly" as const,
        priority: 0.45,
      }))
    );
  }

  try {
    const articleUrls: MetadataRoute.Sitemap = [];
    for (const loc of locales) {
      const rows = await listPublishedArticles(loc);
      for (const article of rows) {
        articleUrls.push({
          url: `${origin}${localePath(loc, `/articles/${article.slug}`)}`,
          lastModified:
            article.updatedAt instanceof Date ?
              article.updatedAt
            : new Date(article.updatedAt),
          changeFrequency: "weekly",
          priority: 0.6,
        });
      }
    }

    let clusterUrls: MetadataRoute.Sitemap = [];
    try {
      const clusters = await listMergedClusterSlugsForSitemap(200);
      /** Hub 无独立 locale 行时，仅收录默认语言路径，避免跨语言重复收录 */
      clusterUrls = clusters.map((row) => ({
        url: `${origin}${localePath(defaultLocale, `/clusters/${row.slug}`)}`,
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
        url: `${origin}${localePath(row.locale as (typeof locales)[number], `/calendar/${row.slug}`)}`,
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
        url: `${origin}${localePath(row.locale as (typeof locales)[number], `/wiki/${row.slug}`)}`,
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
    return staticEntries;
  }
}
