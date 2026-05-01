CREATE TABLE "content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raw_document_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"title" text,
	"source_url" text,
	"published_at" timestamp with time zone,
	"normalized_text" text NOT NULL,
	"status" text DEFAULT 'ingested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_raw_document_id_raw_documents_id_fk" FOREIGN KEY ("raw_document_id") REFERENCES "public"."raw_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_items_raw_document_id_udx" ON "content_items" USING btree ("raw_document_id");
--> statement-breakpoint
CREATE INDEX "content_items_status_published_at_idx" ON "content_items" USING btree ("status","published_at");
--> statement-breakpoint
CREATE INDEX "content_items_source_id_published_at_idx" ON "content_items" USING btree ("source_id","published_at");
