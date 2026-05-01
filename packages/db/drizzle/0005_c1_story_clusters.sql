CREATE TYPE "public"."story_cluster_status" AS ENUM('draft', 'merged', 'archived');--> statement-breakpoint
CREATE TYPE "public"."cluster_item_role" AS ENUM('primary', 'member', 'excluded');--> statement-breakpoint
CREATE TABLE "story_clusters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text,
	"summary" text,
	"status" "public"."story_cluster_status" DEFAULT 'draft' NOT NULL,
	"primary_content_item_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_clusters_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cluster_items" (
	"cluster_id" uuid NOT NULL,
	"content_item_id" uuid NOT NULL,
	"role" "public"."cluster_item_role" DEFAULT 'member' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cluster_items_cluster_id_content_item_id_pk" PRIMARY KEY("cluster_id","content_item_id")
);
--> statement-breakpoint
ALTER TABLE "cluster_items" ADD CONSTRAINT "cluster_items_cluster_id_story_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."story_clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cluster_items" ADD CONSTRAINT "cluster_items_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "story_clusters_status_updated_at_idx" ON "story_clusters" USING btree ("status","updated_at");
--> statement-breakpoint
CREATE INDEX "cluster_items_content_item_id_idx" ON "cluster_items" USING btree ("content_item_id");
--> statement-breakpoint
CREATE INDEX "cluster_items_cluster_id_role_idx" ON "cluster_items" USING btree ("cluster_id","role");
