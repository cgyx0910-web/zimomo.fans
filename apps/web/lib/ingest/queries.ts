import { desc, eq } from "drizzle-orm";

import { getDb } from "@guge/db";
import { contentItems, rawDocumentBlobs, rawDocuments, sources } from "@guge/db/schema";

export async function listRawDocumentsAdmin(limit = 100) {
  const db = getDb();
  return db
    .select({
      id: rawDocuments.id,
      sourceName: sources.name,
      sourceUrl: rawDocuments.sourceUrl,
      title: rawDocuments.title,
      status: rawDocuments.status,
      fetchedAt: rawDocuments.fetchedAt,
      publishedAt: rawDocuments.publishedAt,
      contentType: rawDocuments.contentType,
      storageKind: rawDocumentBlobs.storageKind,
      storageKey: rawDocumentBlobs.storageKey,
      blobSize: rawDocumentBlobs.byteSize,
      contentItemId: contentItems.id,
      normalizedStatus: contentItems.status,
    })
    .from(rawDocuments)
    .innerJoin(sources, eq(sources.id, rawDocuments.sourceId))
    .innerJoin(rawDocumentBlobs, eq(rawDocumentBlobs.id, rawDocuments.blobId))
    .leftJoin(contentItems, eq(contentItems.rawDocumentId, rawDocuments.id))
    .orderBy(desc(rawDocuments.fetchedAt))
    .limit(limit);
}

export async function getRawDocumentDetailById(rawDocumentId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: rawDocuments.id,
      sourceName: sources.name,
      sourceUrl: rawDocuments.sourceUrl,
      title: rawDocuments.title,
      status: rawDocuments.status,
      fetchedAt: rawDocuments.fetchedAt,
      publishedAt: rawDocuments.publishedAt,
      contentType: rawDocuments.contentType,
      parseMeta: rawDocuments.parseMeta,
      storageKind: rawDocumentBlobs.storageKind,
      storageKey: rawDocumentBlobs.storageKey,
      blobSize: rawDocumentBlobs.byteSize,
      contentItemId: contentItems.id,
      normalizedStatus: contentItems.status,
      normalizedText: contentItems.normalizedText,
      contentItemUpdatedAt: contentItems.updatedAt,
    })
    .from(rawDocuments)
    .innerJoin(sources, eq(sources.id, rawDocuments.sourceId))
    .innerJoin(rawDocumentBlobs, eq(rawDocumentBlobs.id, rawDocuments.blobId))
    .leftJoin(contentItems, eq(contentItems.rawDocumentId, rawDocuments.id))
    .where(eq(rawDocuments.id, rawDocumentId))
    .limit(1);

  return rows[0] ?? null;
}
