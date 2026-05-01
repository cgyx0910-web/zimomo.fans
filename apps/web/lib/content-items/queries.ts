import { desc, eq } from "drizzle-orm";

import { getDb } from "@guge/db";
import { contentItems, rawDocuments, sources } from "@guge/db/schema";

export async function listContentItemsAdmin(limit = 200) {
  const db = getDb();
  return db
    .select({
      id: contentItems.id,
      rawDocumentId: contentItems.rawDocumentId,
      sourceName: sources.name,
      title: contentItems.title,
      sourceUrl: contentItems.sourceUrl,
      status: contentItems.status,
      publishedAt: contentItems.publishedAt,
      updatedAt: contentItems.updatedAt,
      rawFetchedAt: rawDocuments.fetchedAt,
    })
    .from(contentItems)
    .innerJoin(sources, eq(sources.id, contentItems.sourceId))
    .innerJoin(rawDocuments, eq(rawDocuments.id, contentItems.rawDocumentId))
    .orderBy(desc(contentItems.updatedAt))
    .limit(limit);
}
