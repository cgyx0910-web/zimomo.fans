import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    feedUrl: text("feed_url").notNull().unique(),
    isActive: boolean("is_active").notNull().default(true),
    lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
    lastStatus: text("last_status"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("sources_is_active_idx").on(table.isActive),
    index("sources_last_fetched_at_idx").on(table.lastFetchedAt),
  ]
);
