CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"feed_url" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_fetched_at" timestamp with time zone,
	"last_status" text,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_feed_url_unique" UNIQUE("feed_url")
);
--> statement-breakpoint
CREATE INDEX "sources_is_active_idx" ON "sources" USING btree ("is_active");
--> statement-breakpoint
CREATE INDEX "sources_last_fetched_at_idx" ON "sources" USING btree ("last_fetched_at");
