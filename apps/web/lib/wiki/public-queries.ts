import { and, asc, desc, eq } from "drizzle-orm";

import { wikiEntities } from "@guge/db/schema";
import { getDb } from "@guge/db";

export async function listPublishedWikiEntitiesByTitle(locale: string) {
  const db = getDb();
  return db
    .select({
      slug: wikiEntities.slug,
      title: wikiEntities.title,
      lead: wikiEntities.lead,
      subtitle: wikiEntities.subtitle,
      updatedAt: wikiEntities.updatedAt,
    })
    .from(wikiEntities)
    .where(
      and(eq(wikiEntities.status, "published"), eq(wikiEntities.locale, locale))
    )
    .orderBy(asc(wikiEntities.title));
}

export async function getPublishedWikiEntityBySlug(
  slug: string,
  locale: string
) {
  const db = getDb();
  const rows = await db
    .select()
    .from(wikiEntities)
    .where(
      and(
        eq(wikiEntities.slug, slug),
        eq(wikiEntities.status, "published"),
        eq(wikiEntities.locale, locale)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

/** sitemap：`published`，按更新时间 */
export async function listPublishedWikiEntitiesForSitemap(limit = 500) {
  const db = getDb();
  return db
    .select({
      slug: wikiEntities.slug,
      locale: wikiEntities.locale,
      updatedAt: wikiEntities.updatedAt,
    })
    .from(wikiEntities)
    .where(eq(wikiEntities.status, "published"))
    .orderBy(desc(wikiEntities.updatedAt))
    .limit(limit);
}
