import { sql } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { articles } from "./articles";
import { contentItems } from "./content_items";

export const storyClusterStatusEnum = pgEnum("story_cluster_status", [
  "draft",
  "merged",
  "archived",
]);

/** 同一事件的多源聚类（Hub 骨架）；primary FK 与 merged 主文唯一性见 C-Polish 迁移。 */
export const storyClusters = pgTable(
  "story_clusters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title"),
    summary: text("summary"),
    status: storyClusterStatusEnum("status").notNull().default("draft"),
    primaryContentItemId: uuid("primary_content_item_id").references(() => contentItems.id, {
      onDelete: "set null",
    }),
    /** 单一「主文」article；主文已 published 时 Hub canonical 指向主文且不进 sitemap（C4） */
    publishedArticleId: uuid("published_article_id").references(() => articles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("story_clusters_status_updated_at_idx").on(table.status, table.updatedAt),
    index("story_clusters_published_article_id_idx").on(table.publishedArticleId),
    uniqueIndex("story_clusters_pub_article_merged_uq")
      .on(table.publishedArticleId)
      .where(sql`${table.status} = 'merged' AND ${table.publishedArticleId} IS NOT NULL`),
  ]
);
