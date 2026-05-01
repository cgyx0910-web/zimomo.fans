CREATE TYPE "public"."newsletter_subscription_status" AS ENUM('pending_confirmation', 'confirmed', 'unsubscribed');--> statement-breakpoint
CREATE TABLE "newsletter_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"status" "newsletter_subscription_status" DEFAULT 'pending_confirmation' NOT NULL,
	"confirm_token_hash" text,
	"confirm_token_expires_at" timestamp with time zone,
	"unsubscribe_token_hash" text,
	"confirmed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_subscriptions_email_uq" ON "newsletter_subscriptions" USING btree ("email");--> statement-breakpoint
CREATE INDEX "newsletter_subscriptions_status_created_idx" ON "newsletter_subscriptions" USING btree ("status","created_at");