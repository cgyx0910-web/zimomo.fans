CREATE TABLE "raw_document_blobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_kind" text DEFAULT 'local' NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"sha256" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "raw_document_blobs_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "raw_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"blob_id" uuid NOT NULL,
	"dedupe_key" text NOT NULL,
	"external_id" text,
	"source_url" text,
	"title" text,
	"published_at" timestamp with time zone,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"content_type" text DEFAULT 'application/xml' NOT NULL,
	"status" text DEFAULT 'ingested' NOT NULL,
	"parse_meta" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "raw_documents" ADD CONSTRAINT "raw_documents_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_documents" ADD CONSTRAINT "raw_documents_blob_id_raw_document_blobs_id_fk" FOREIGN KEY ("blob_id") REFERENCES "public"."raw_document_blobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "raw_document_blobs_storage_kind_idx" ON "raw_document_blobs" USING btree ("storage_kind");
--> statement-breakpoint
CREATE INDEX "raw_document_blobs_sha256_idx" ON "raw_document_blobs" USING btree ("sha256");
--> statement-breakpoint
CREATE UNIQUE INDEX "raw_documents_source_id_dedupe_key_udx" ON "raw_documents" USING btree ("source_id","dedupe_key");
--> statement-breakpoint
CREATE INDEX "raw_documents_source_id_fetched_at_idx" ON "raw_documents" USING btree ("source_id","fetched_at");
--> statement-breakpoint
CREATE INDEX "raw_documents_status_idx" ON "raw_documents" USING btree ("status");
