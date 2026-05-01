import { and, desc, eq, isNull } from "drizzle-orm";

import { getDb } from "@guge/db";
import { contentItems, rawDocumentBlobs, rawDocuments } from "@guge/db/schema";

import { readLocalBlobXml } from "@/lib/normalize/blob-reader";
import { extractNormalizedTextFromXml } from "@/lib/normalize/extract";

const DEFAULT_BATCH_LIMIT = 50;

export type NormalizeSummary = {
  scannedCount: number;
  successCount: number;
  failedCount: number;
  durationMs: number;
};

export async function runNormalizeBatch(
  limit = DEFAULT_BATCH_LIMIT
): Promise<NormalizeSummary> {
  const startedAt = Date.now();
  const db = getDb();

  const candidates = await db
    .select({
      rawDocumentId: rawDocuments.id,
      sourceId: rawDocuments.sourceId,
      title: rawDocuments.title,
      sourceUrl: rawDocuments.sourceUrl,
      publishedAt: rawDocuments.publishedAt,
      blobStorageKind: rawDocumentBlobs.storageKind,
      blobStorageKey: rawDocumentBlobs.storageKey,
    })
    .from(rawDocuments)
    .innerJoin(rawDocumentBlobs, eq(rawDocumentBlobs.id, rawDocuments.blobId))
    .leftJoin(contentItems, eq(contentItems.rawDocumentId, rawDocuments.id))
    .where(
      and(eq(rawDocuments.status, "ingested"), isNull(contentItems.rawDocumentId))
    )
    .orderBy(desc(rawDocuments.fetchedAt))
    .limit(limit);

  let successCount = 0;
  let failedCount = 0;

  for (const row of candidates) {
    try {
      if (row.blobStorageKind !== "local") {
        throw new Error(`unsupported storage kind: ${row.blobStorageKind}`);
      }

      const xml = await readLocalBlobXml(row.blobStorageKey);
      const normalizedText = extractNormalizedTextFromXml(xml);
      if (!normalizedText) {
        throw new Error("normalized text is empty");
      }

      await db
        .insert(contentItems)
        .values({
          rawDocumentId: row.rawDocumentId,
          sourceId: row.sourceId,
          title: row.title,
          sourceUrl: row.sourceUrl,
          publishedAt: row.publishedAt,
          normalizedText,
          status: "ingested",
        })
        .onConflictDoUpdate({
          target: contentItems.rawDocumentId,
          set: {
            sourceId: row.sourceId,
            title: row.title,
            sourceUrl: row.sourceUrl,
            publishedAt: row.publishedAt,
            normalizedText,
            status: "ingested",
            updatedAt: new Date(),
          },
        });
      await db
        .update(rawDocuments)
        .set({
          normalizationError: null,
          status: "ingested",
          updatedAt: new Date(),
        })
        .where(eq(rawDocuments.id, row.rawDocumentId));
      successCount += 1;
    } catch (error) {
      failedCount += 1;
      console.error("[normalize] failed row:", row.rawDocumentId, error);
      const message =
        error instanceof Error ? error.message.slice(0, 500) : "normalize error";
      await db
        .update(rawDocuments)
        .set({
          status: "normalize_failed",
          normalizationError: message,
          updatedAt: new Date(),
        })
        .where(eq(rawDocuments.id, row.rawDocumentId));
    }
  }

  return {
    scannedCount: candidates.length,
    successCount,
    failedCount,
    durationMs: Date.now() - startedAt,
  };
}
