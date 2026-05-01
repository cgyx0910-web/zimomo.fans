import {
  bigint,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { rawDocuments } from "./raw_documents";
import { sources } from "./sources";

export const contentItemStatusEnum = pgEnum("content_item_status", ["ingested"]);

export const contentItems = pgTable(
  "content_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rawDocumentId: uuid("raw_document_id")
      .notNull()
      .references(() => rawDocuments.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    title: text("title"),
    sourceUrl: text("source_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    normalizedText: text("normalized_text").notNull(),
    /** C2：规范化 URL 的 sha256 hex 前 32 字符；无有效 URL 时为 null */
    urlHash: text("url_hash"),
    /** C2：64 位 simhash（BigInt）；正文过短无法分词时为 null */
    simhash: bigint("simhash", { mode: "bigint" }),
    status: contentItemStatusEnum("status").notNull().default("ingested"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("content_items_raw_document_id_udx").on(table.rawDocumentId),
    index("content_items_status_published_at_idx").on(table.status, table.publishedAt),
    index("content_items_source_id_published_at_idx").on(
      table.sourceId,
      table.publishedAt
    ),
    index("content_items_url_hash_idx").on(table.urlHash),
    index("content_items_simhash_idx").on(table.simhash),
  ]
);
