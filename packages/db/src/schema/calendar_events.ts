import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const calendarEventStatuses = ["draft", "published"] as const;

export type CalendarEventStatus = (typeof calendarEventStatuses)[number];

export const calendarEventStatusEnum = pgEnum("calendar_event_status", [
  "draft",
  "published",
]);

/**
 * 粉丝向活动/发售窗口等待办日历项。`all_day` 为 true 时 ICS 使用 DATE 类型；
 * DB 仍存 timestamptz（全天：起为当日 00:00:00 UTC，止为当日 23:59:59.999 UTC，含跨天则止日为结束日同规则）。
 */
export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    locale: text("locale").notNull().default("zh-CN"),
    title: text("title").notNull(),
    /** 对外导语（SEO），发布时建议 ≥20 字符，由应用校验 */
    lead: text("lead").notNull(),
    body: text("body"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    allDay: boolean("all_day").notNull().default(false),
    status: calendarEventStatusEnum("status").notNull().default("draft"),
    sourceUrl: text("source_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("calendar_events_slug_locale_uidx").on(table.slug, table.locale),
    index("calendar_events_status_starts_at_idx").on(
      table.status,
      table.startsAt
    ),
  ]
);
