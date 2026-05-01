import { and, asc, desc, eq, gt, lt } from "drizzle-orm";

import { calendarEvents } from "@guge/db/schema";
import { getDb } from "@guge/db";

/** 与时间区间相交且已发布的活动（starts < rangeEnd AND ends > rangeStart） */
export async function listPublishedCalendarEventsOverlappingRange(
  rangeStart: Date,
  rangeEnd: Date
) {
  const db = getDb();
  return db
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.status, "published"),
        lt(calendarEvents.startsAt, rangeEnd),
        gt(calendarEvents.endsAt, rangeStart)
      )
    )
    .orderBy(asc(calendarEvents.startsAt));
}

export async function getPublishedCalendarEventBySlug(slug: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.slug, slug),
        eq(calendarEvents.status, "published")
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

/** sitemap：`published`，按更新时间倒序 */
export async function listPublishedCalendarEventsForSitemap(limit = 500) {
  const db = getDb();
  return db
    .select({
      slug: calendarEvents.slug,
      updatedAt: calendarEvents.updatedAt,
    })
    .from(calendarEvents)
    .where(eq(calendarEvents.status, "published"))
    .orderBy(desc(calendarEvents.updatedAt))
    .limit(limit);
}

/** ICS：与区间相交的 `published` 条目 */
export async function listPublishedCalendarEventsOverlappingRangeForFeed(
  rangeStart: Date,
  rangeEnd: Date
) {
  const db = getDb();
  return db
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.status, "published"),
        lt(calendarEvents.startsAt, rangeEnd),
        gt(calendarEvents.endsAt, rangeStart)
      )
    )
    .orderBy(asc(calendarEvents.startsAt));
}
