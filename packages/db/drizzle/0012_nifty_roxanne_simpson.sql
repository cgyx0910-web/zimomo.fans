CREATE TYPE "public"."calendar_event_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"lead" text NOT NULL,
	"body" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"all_day" boolean DEFAULT false NOT NULL,
	"status" "calendar_event_status" DEFAULT 'draft' NOT NULL,
	"source_url" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "calendar_events_status_starts_at_idx" ON "calendar_events" USING btree ("status","starts_at");
