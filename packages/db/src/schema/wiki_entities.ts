import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import type { EditorialFaqJson } from "./editorial_faq";

export const wikiEntityStatuses = ["draft", "published"] as const;

export type WikiEntityStatus = (typeof wikiEntityStatuses)[number];

export const wikiEntityStatusEnum = pgEnum("wiki_entity_status", [
  "draft",
  "published",
]);

/**
 * 粉丝向百科条目（长青页）。导语 `lead` 用于 SEO；
 * `body` 为编辑部正文（可先 Markdown 风格手写，仍为纯文本存储）。
 */
export const wikiEntities = pgTable(
  "wiki_entities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    /** 可选副标题（模板顶部展示），非 SEO 主字段 */
    subtitle: text("subtitle"),
    /** 对外导语；发布时在应用层校最短长度 */
    lead: text("lead").notNull(),
    body: text("body"),
    editorialFaq: jsonb("editorial_faq").$type<EditorialFaqJson | null>(),
    status: wikiEntityStatusEnum("status").notNull().default("draft"),
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
    index("wiki_entities_status_updated_at_idx").on(
      table.status,
      table.updatedAt
    ),
  ]
);
