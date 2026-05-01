ALTER TABLE "content_items" ADD COLUMN "url_hash" text;--> statement-breakpoint
ALTER TABLE "content_items" ADD COLUMN "simhash" bigint;--> statement-breakpoint
CREATE INDEX "content_items_url_hash_idx" ON "content_items" USING btree ("url_hash");--> statement-breakpoint
CREATE INDEX "content_items_simhash_idx" ON "content_items" USING btree ("simhash");
