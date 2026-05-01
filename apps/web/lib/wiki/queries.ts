import { desc, eq } from "drizzle-orm";

import { wikiEntities } from "@guge/db/schema";
import { getDb } from "@guge/db";

export async function listWikiEntitiesAdmin() {
  const db = getDb();
  return db.select().from(wikiEntities).orderBy(desc(wikiEntities.updatedAt));
}

export async function getWikiEntityById(id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(wikiEntities)
    .where(eq(wikiEntities.id, id))
    .limit(1);
  return rows[0] ?? null;
}
