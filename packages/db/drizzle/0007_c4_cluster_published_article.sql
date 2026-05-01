ALTER TABLE "story_clusters" ADD COLUMN "published_article_id" uuid;--> statement-breakpoint
ALTER TABLE "story_clusters" ADD CONSTRAINT "story_clusters_published_article_id_articles_id_fk" FOREIGN KEY ("published_article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "story_clusters_published_article_id_idx" ON "story_clusters" USING btree ("published_article_id");
