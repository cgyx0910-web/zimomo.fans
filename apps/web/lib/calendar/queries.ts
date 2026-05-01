import { desc, eq } from "drizzle-orm";

import { calendarEvents } from "@guge/db/schema";
import { getDb } from "@guge/db";

export async function listCalendarEventsAdmin() {
  const db = getDb();
  return db
    .select()
    .from(calendarEvents)
    .orderBy(desc(calendarEvents.startsAt));
}

export async function getCalendarEventById(id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.id, id))
    .limit(1);
  return rows[0] ?? null;
}
