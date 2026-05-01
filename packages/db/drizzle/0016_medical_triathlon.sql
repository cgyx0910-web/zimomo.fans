CREATE TYPE "public"."article_comment_status" AS ENUM('pending', 'approved', 'rejected', 'spam_blocked');--> statement-breakpoint
CREATE TABLE "article_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"status" "article_comment_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_comments" ADD CONSTRAINT "article_comments_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_comments" ADD CONSTRAINT "article_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_comments_article_id_status_created_idx" ON "article_comments" USING btree ("article_id","status","created_at");--> statement-breakpoint
CREATE INDEX "article_comments_status_created_idx" ON "article_comments" USING btree ("status","created_at");