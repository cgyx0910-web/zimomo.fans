import {
  and,
  asc,
  desc,
  eq,
  isNotNull,
  isNull,
  ne,
} from "drizzle-orm";

import { getDb } from "@guge/db";
import {
  clusterItems,
  contentItems,
  storyClusters,
} from "@guge/db/schema";

import { computeUrlHash } from "@/lib/clusters/url-hash";
import {
  computeSimhash64,
  hammingDistance64,
  readSimhashDistanceThreshold,
} from "@/lib/clusters/simhash";

const DEFAULT_BATCH_LIMIT = 100;
const SIMHASH_SCAN_CLUSTER_LIMIT = 200;

export type ClusterBucketSummary = {
  scannedCount: number;
  joinedByUrlCount: number;
  joinedBySimhashCount: number;
  createdCount: number;
  durationMs: number;
};

function randomSlugSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

function buildNewClusterSlug(args: {
  urlHash: string | null;
  simhash: bigint | null;
}): string {
  if (args.urlHash) {
    return `c-${args.urlHash.slice(0, 8)}`;
  }
  if (args.simhash !== null) {
    const hex = args.simhash.toString(16).padStart(16, "0");
    return `c-${hex.slice(0, 12)}-${randomSlugSuffix()}`;
  }
  return `c-${Date.now().toString(36)}-${randomSlugSuffix()}`;
}

function isUniqueViolation(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /unique|duplicate/i.test(msg);
}

function coerceBigInt(value: unknown): bigint | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string" && value.trim()) {
    try {
      return BigInt(value.trim());
    } catch {
      return null;
    }
  }
  return null;
}

export async function runClusterBucketBatch(
  limit = DEFAULT_BATCH_LIMIT
): Promise<ClusterBucketSummary> {
  const startedAt = Date.now();
  const db = getDb();
  const threshold = readSimhashDistanceThreshold();

  const candidates = await db
    .select({
      id: contentItems.id,
      sourceUrl: contentItems.sourceUrl,
      normalizedText: contentItems.normalizedText,
      title: contentItems.title,
    })
    .from(contentItems)
    .leftJoin(clusterItems, eq(clusterItems.contentItemId, contentItems.id))
    .where(and(eq(contentItems.status, "ingested"), isNull(clusterItems.contentItemId)))
    .orderBy(desc(contentItems.updatedAt))
    .limit(limit);

  let joinedByUrlCount = 0;
  let joinedBySimhashCount = 0;
  let createdCount = 0;

  for (const row of candidates) {
    const urlHash = computeUrlHash(row.sourceUrl);
    const simhash = computeSimhash64(row.normalizedText);

    try {
      const outcome = await db.transaction(async (tx) => {
        await tx
          .update(contentItems)
          .set({
            urlHash,
            simhash,
            updatedAt: new Date(),
          })
          .where(eq(contentItems.id, row.id));

        const existing = await tx
          .select({ clusterId: clusterItems.clusterId })
          .from(clusterItems)
          .where(eq(clusterItems.contentItemId, row.id))
          .limit(1);

        if (existing.length > 0) {
          return "skip";
        }

        if (urlHash) {
          const urlHit = await tx
            .select({
              clusterId: clusterItems.clusterId,
            })
            .from(contentItems)
            .innerJoin(clusterItems, eq(clusterItems.contentItemId, contentItems.id))
            .innerJoin(storyClusters, eq(storyClusters.id, clusterItems.clusterId))
            .where(and(eq(contentItems.urlHash, urlHash), ne(contentItems.id, row.id)))
            .orderBy(asc(storyClusters.createdAt))
            .limit(1);

          const hit = urlHit[0];
          if (hit) {
            await tx.insert(clusterItems).values({
              clusterId: hit.clusterId,
              contentItemId: row.id,
              role: "member",
            });
            return "url";
          }
        }

        if (simhash !== null) {
          const primaries = await tx
            .select({
              clusterId: storyClusters.id,
              clusterCreated: storyClusters.createdAt,
              primarySimhash: contentItems.simhash,
            })
            .from(storyClusters)
            .innerJoin(
              contentItems,
              eq(contentItems.id, storyClusters.primaryContentItemId)
            )
            .where(isNotNull(contentItems.simhash))
            .orderBy(desc(storyClusters.createdAt))
            .limit(SIMHASH_SCAN_CLUSTER_LIMIT);

          type Match = { clusterId: string; dist: number; createdMs: number };
          const matches: Match[] = [];
          for (const p of primaries) {
            const primarySim = coerceBigInt(p.primarySimhash);
            if (primarySim === null) {
              continue;
            }
            const dist = hammingDistance64(simhash, primarySim);
            if (dist <= threshold) {
              const created = p.clusterCreated instanceof Date ? p.clusterCreated : new Date(p.clusterCreated ?? 0);
              matches.push({
                clusterId: p.clusterId,
                dist,
                createdMs: created.getTime(),
              });
            }
          }
          matches.sort((a, b) => a.dist - b.dist || b.createdMs - a.createdMs);
          const winner = matches[0];
          if (winner) {
            await tx.insert(clusterItems).values({
              clusterId: winner.clusterId,
              contentItemId: row.id,
              role: "member",
            });
            return "sim";
          }
        }

        let slug = buildNewClusterSlug({ urlHash, simhash });
        for (let attempt = 0; attempt < 8; attempt += 1) {
          try {
            const inserted = await tx
              .insert(storyClusters)
              .values({
                slug,
                title: row.title,
                status: "draft",
                primaryContentItemId: row.id,
              })
              .returning({ id: storyClusters.id });

            const clusterId = inserted[0]?.id;
            if (!clusterId) {
              throw new Error("failed to insert story_cluster");
            }

            await tx.insert(clusterItems).values({
              clusterId,
              contentItemId: row.id,
              role: "primary",
            });
            return "new";
          } catch (e) {
            if (isUniqueViolation(e)) {
              slug = `${buildNewClusterSlug({ urlHash, simhash })}-${randomSlugSuffix()}`;
              continue;
            }
            throw e;
          }
        }
        throw new Error("could not allocate unique cluster slug");
      });

      if (outcome === "url") {
        joinedByUrlCount += 1;
      } else if (outcome === "sim") {
        joinedBySimhashCount += 1;
      } else if (outcome === "new") {
        createdCount += 1;
      }
    } catch (error) {
      console.error("[cluster-bucket] failed row:", row.id, error);
    }
  }

  return {
    scannedCount: candidates.length,
    joinedByUrlCount,
    joinedBySimhashCount,
    createdCount,
    durationMs: Date.now() - startedAt,
  };
}
