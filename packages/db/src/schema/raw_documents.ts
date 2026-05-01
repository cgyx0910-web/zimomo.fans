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

import { rawDocumentBlobs } from "./raw_document_blobs";
import { sources } from "./sources";

export const rawDocumentStatusEnum = pgEnum("raw_document_status", [
  "ingested",
  "normalize_failed",
]);

export const rawDocuments = pgTable(
  "raw_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    blobId: uuid("blob_id")
      .notNull()
      .references(() => rawDocumentBlobs.id, { onDelete: "cascade" }),
    dedupeKey: text("dedupe_key").notNull(),
    externalId: text("external_id"),
    sourceUrl: text("source_url"),
    title: text("title"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    contentType: text("content_type").notNull().default("application/xml"),
    status: rawDocumentStatusEnum("status").notNull().default("ingested"),
    normalizationError: text("normalization_error"),
    parseMeta: jsonb("parse_meta")
      .$type<{
        guid: string | null;
        link: string | null;
        author: string | null;
      }>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("raw_documents_source_id_dedupe_key_udx").on(
      table.sourceId,
      table.dedupeKey
    ),
    index("raw_documents_source_id_fetched_at_idx").on(
      table.sourceId,
      table.fetchedAt
    ),
    index("raw_documents_status_idx").on(table.status),
    index("raw_documents_status_fetched_at_idx").on(table.status, table.fetchedAt),
  ]
);
