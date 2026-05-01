import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { articles } from "./articles";
import { users } from "./users";

/** F2：访客评论须经人工审核；spam_blocked 为规则命中，仍可后台误伤放行 */
export const articleCommentStatuses = [
  "pending",
  "approved",
  "rejected",
  "spam_blocked",
] as const;

export type ArticleCommentStatus =
  (typeof articleCommentStatuses)[number];

export const articleCommentStatusEnum = pgEnum("article_comment_status", [
  "pending",
  "approved",
  "rejected",
  "spam_blocked",
]);

export const articleComments = pgTable(
  "article_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    status: articleCommentStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("article_comments_article_id_status_created_idx").on(
      table.articleId,
      table.status,
      table.createdAt
    ),
    index("article_comments_status_created_idx").on(
      table.status,
      table.createdAt
    ),
  ]
);
