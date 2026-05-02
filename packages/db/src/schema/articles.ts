import { desc, sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { EditorialFaqJson } from "./editorial_faq";

/** D2：LLM 生成的摘要/FAQ 草案，仅编辑部人审后可用；不自动进 excerpt/body */
export type ArticleEnrichDraftJson = {
  summary: string | null;
  faq: { question: string; answer: string }[];
  source_urls: string[];
  model: string | null;
  generated_at: string;
  warnings?: string[];
};

/** D1：质量闸门 override 持久化审计（最多由应用层截断保留条数） */
export type QualityGateOverrideEventJson = {
  at: string;
  slug: string;
  article_id: string;
};

/** 文章工作流：人审前可 draft/in_review/blocked；仅 published 对公网索引并走质检 */
export const articleWorkflowStatuses = [
  "draft",
  "in_review",
  "blocked",
  "published",
] as const;

export type ArticleWorkflowStatus = (typeof articleWorkflowStatuses)[number];

export const articleStatusEnum = pgEnum("article_status", [
  "draft",
  "in_review",
  "blocked",
  "published",
]);

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    /** 内容语言；同一 slug 可在不同 locale 各有一条（如 zh-CN / en） */
    locale: text("locale").notNull().default("zh-CN"),
    title: text("title"),
    excerpt: text("excerpt"),
    body: text("body"),
    status: articleStatusEnum("status").notNull().default("draft"),
    canonicalUrl: text("canonical_url"),
    primarySourceUrl: text("primary_source_url"),
    ogTitle: text("og_title"),
    ogDescription: text("og_description"),
    ogImageUrl: text("og_image_url"),
    /** E3：访客可见的编辑部 FAQ；与 enrich_draft 中 LLM 草案无关 */
    editorialFaq: jsonb("editorial_faq").$type<EditorialFaqJson | null>(),
    enrichDraft: jsonb("enrich_draft").$type<ArticleEnrichDraftJson | null>(),
    qualityGateOverrideEvents: jsonb("quality_gate_override_events")
      .$type<QualityGateOverrideEventJson[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
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
    uniqueIndex("articles_slug_locale_uidx").on(table.slug, table.locale),
    index("articles_status_published_at_idx").on(
      table.status,
      desc(table.publishedAt)
    ),
  ]
);
