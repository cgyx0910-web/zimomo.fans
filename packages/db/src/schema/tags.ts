import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
