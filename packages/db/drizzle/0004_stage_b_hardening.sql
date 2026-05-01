CREATE TYPE "public"."raw_document_status" AS ENUM('ingested', 'normalize_failed');--> statement-breakpoint
CREATE TYPE "public"."content_item_status" AS ENUM('ingested');--> statement-breakpoint
ALTER TABLE "raw_documents" ADD COLUMN "normalization_error" text;--> statement-breakpoint
ALTER TABLE "raw_documents" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "raw_documents" ALTER COLUMN "status" TYPE "public"."raw_document_status" USING "status"::"public"."raw_document_status";--> statement-breakpoint
ALTER TABLE "raw_documents" ALTER COLUMN "status" SET DEFAULT 'ingested';--> statement-breakpoint
ALTER TABLE "content_items" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "content_items" ALTER COLUMN "status" TYPE "public"."content_item_status" USING "status"::"public"."content_item_status";--> statement-breakpoint
ALTER TABLE "content_items" ALTER COLUMN "status" SET DEFAULT 'ingested';--> statement-breakpoint
CREATE INDEX "raw_documents_status_fetched_at_idx" ON "raw_documents" USING btree ("status","fetched_at");
