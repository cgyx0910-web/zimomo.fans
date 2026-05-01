import { createHash } from "node:crypto";

import { and, count, eq } from "drizzle-orm";
import { getDb } from "@guge/db";
import { rawDocumentBlobs, rawDocuments } from "@guge/db/schema";

import { getBlobStore } from "@/lib/storage";

export type ParsedFeedEntry = {
  rawXml: string;
  guid: string | null;
  link: string | null;
  title: string | null;
  author: string | null;
  publishedAt: Date | null;
};

function hashRawXml(rawXml: string): string {
  return createHash("sha256").update(rawXml, "utf8").digest("hex");
}

function dedupeKeyForEntry(sourceId: string, entry: ParsedFeedEntry): string {
  const stable = `${sourceId}|${entry.guid ?? ""}|${entry.link ?? ""}|${entry.title ?? ""}|${entry.publishedAt?.toISOString() ?? ""}`;
  return createHash("sha256").update(stable, "utf8").digest("hex");
}

export async function persistRawEntries(args: {
  sourceId: string;
  fetchedAt: Date;
  entries: ParsedFeedEntry[];
  contentType: string;
}): Promise<number> {
  const db = getDb();
  const blobStore = getBlobStore();
  let storedCount = 0;
  const blobsToDeleteAfterCommit: string[] = [];

  for (const entry of args.entries) {
    const dedupeKey = dedupeKeyForEntry(args.sourceId, entry);
    const incomingSha = hashRawXml(entry.rawXml);
    const existing = await db
      .select({
        rawId: rawDocuments.id,
        oldBlobId: rawDocuments.blobId,
        oldStorageKey: rawDocumentBlobs.storageKey,
        oldSha: rawDocumentBlobs.sha256,
      })
      .from(rawDocuments)
      .innerJoin(rawDocumentBlobs, eq(rawDocumentBlobs.id, rawDocuments.blobId))
      .where(
        and(eq(rawDocuments.sourceId, args.sourceId), eq(rawDocuments.dedupeKey, dedupeKey))
      )
      .limit(1);

    const prev = existing[0];
    let putResult: Awaited<ReturnType<typeof blobStore.putBlob>> | null = null;
    if (!prev || prev.oldSha !== incomingSha) {
      putResult = await blobStore.putBlob({
        data: entry.rawXml,
        contentType: args.contentType,
      });
    }

    let newBlobStorageKeyForCleanup: string | null = null;
    try {
      await db.transaction(async (tx) => {
        let finalBlobId = prev?.oldBlobId ?? null;
        let finalBlobStorageKey = prev?.oldStorageKey ?? null;

        if (putResult) {
          newBlobStorageKeyForCleanup = putResult.storageKey;
          const insertedBlobRows = await tx
            .insert(rawDocumentBlobs)
            .values({
              storageKind: putResult.storageKind,
              storageKey: putResult.storageKey,
              contentType: putResult.contentType,
              byteSize: putResult.byteSize,
              sha256: putResult.sha256,
            })
            .returning({ id: rawDocumentBlobs.id });

          const insertedBlobId = insertedBlobRows[0]?.id;
          if (!insertedBlobId) {
            throw new Error("failed to insert raw_document_blob");
          }
          finalBlobId = insertedBlobId;
          finalBlobStorageKey = putResult.storageKey;
        }

        if (!finalBlobId) {
          throw new Error("missing blob id for raw document");
        }

        await tx
          .insert(rawDocuments)
          .values({
            sourceId: args.sourceId,
            blobId: finalBlobId,
            dedupeKey,
            externalId: entry.guid,
            sourceUrl: entry.link,
            title: entry.title,
            publishedAt: entry.publishedAt,
            fetchedAt: args.fetchedAt,
            contentType: args.contentType,
            status: "ingested",
            normalizationError: null,
            parseMeta: {
              guid: entry.guid,
              link: entry.link,
              author: entry.author,
            },
          })
          .onConflictDoUpdate({
            target: [rawDocuments.sourceId, rawDocuments.dedupeKey],
            set: {
              blobId: finalBlobId,
              externalId: entry.guid,
              sourceUrl: entry.link,
              title: entry.title,
              publishedAt: entry.publishedAt,
              fetchedAt: args.fetchedAt,
              contentType: args.contentType,
              status: "ingested",
              normalizationError: null,
              parseMeta: {
                guid: entry.guid,
                link: entry.link,
                author: entry.author,
              },
              updatedAt: new Date(),
            },
          });

        if (
          prev &&
          putResult &&
          prev.oldBlobId !== finalBlobId &&
          prev.oldStorageKey &&
          finalBlobStorageKey &&
          prev.oldStorageKey !== finalBlobStorageKey
        ) {
          const refRows = await tx
            .select({ cnt: count() })
            .from(rawDocuments)
            .where(eq(rawDocuments.blobId, prev.oldBlobId));
          const stillUsed = Number(refRows[0]?.cnt ?? 0) > 0;
          if (!stillUsed) {
            await tx
              .delete(rawDocumentBlobs)
              .where(eq(rawDocumentBlobs.id, prev.oldBlobId));
            blobsToDeleteAfterCommit.push(prev.oldStorageKey);
          }
        }
      });
      storedCount += 1;
      newBlobStorageKeyForCleanup = null;
    } catch (error) {
      if (newBlobStorageKeyForCleanup) {
        try {
          await blobStore.deleteBlob(newBlobStorageKeyForCleanup);
        } catch (cleanupError) {
          console.error("[ingest] blob cleanup failed:", cleanupError);
        }
      }
      throw error;
    }
  }

  for (const storageKey of blobsToDeleteAfterCommit) {
    try {
      await blobStore.deleteBlob(storageKey);
    } catch (cleanupError) {
      console.error("[ingest] old blob file cleanup failed:", cleanupError);
    }
  }

  return storedCount;
}
