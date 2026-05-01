import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const rawDocumentBlobs = pgTable(
  "raw_document_blobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storageKind: text("storage_kind").notNull().default("local"),
    storageKey: text("storage_key").notNull().unique(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    sha256: text("sha256").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("raw_document_blobs_storage_kind_idx").on(table.storageKind),
    index("raw_document_blobs_sha256_idx").on(table.sha256),
  ]
);
