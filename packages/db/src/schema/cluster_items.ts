import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { contentItems } from "./content_items";
import { storyClusters } from "./story_clusters";

export const clusterItemRoleEnum = pgEnum("cluster_item_role", [
  "primary",
  "member",
  "excluded",
]);

export const clusterItems = pgTable(
  "cluster_items",
  {
    clusterId: uuid("cluster_id")
      .notNull()
      .references(() => storyClusters.id, { onDelete: "cascade" }),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    role: clusterItemRoleEnum("role").notNull().default("member"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.clusterId, table.contentItemId] }),
    index("cluster_items_content_item_id_idx").on(table.contentItemId),
    index("cluster_items_cluster_id_role_idx").on(table.clusterId, table.role),
  ]
);
