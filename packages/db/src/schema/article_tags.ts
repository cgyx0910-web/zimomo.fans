import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";

import { articles } from "./articles";
import { tags } from "./tags";

export const articleTags = pgTable(
  "article_tags",
  {
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.articleId, t.tagId] }),
  })
);
