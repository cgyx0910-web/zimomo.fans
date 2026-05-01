CREATE TYPE "public"."wiki_entity_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "wiki_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"lead" text NOT NULL,
	"body" text,
	"status" "wiki_entity_status" DEFAULT 'draft' NOT NULL,
	"source_url" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wiki_entities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "wiki_entities_status_updated_at_idx" ON "wiki_entities" USING btree ("status","updated_at");