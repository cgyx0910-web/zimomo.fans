import { desc, eq } from "drizzle-orm";

import { getDb } from "@guge/db";
import { sources } from "@guge/db/schema";

export async function listSourcesAdmin() {
  const db = getDb();
  return db.select().from(sources).orderBy(desc(sources.createdAt));
}

export async function updateSourceFetchStatus(args: {
  sourceId: string;
  status: string;
  error: string | null;
  fetchedAt: Date;
}) {
  const db = getDb();
  await db
    .update(sources)
    .set({
      lastStatus: args.status,
      lastError: args.error,
      lastFetchedAt: args.fetchedAt,
    })
    .where(eq(sources.id, args.sourceId));
}

export async function listActiveSources() {
  const db = getDb();
  return db.select().from(sources).where(eq(sources.isActive, true));
}
