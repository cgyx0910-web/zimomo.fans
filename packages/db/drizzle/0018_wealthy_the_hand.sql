ALTER TABLE "articles" DROP CONSTRAINT "articles_slug_unique";--> statement-breakpoint
ALTER TABLE "calendar_events" DROP CONSTRAINT "calendar_events_slug_unique";--> statement-breakpoint
ALTER TABLE "wiki_entities" DROP CONSTRAINT "wiki_entities_slug_unique";--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "locale" text DEFAULT 'zh-CN' NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "locale" text DEFAULT 'zh-CN' NOT NULL;--> statement-breakpoint
ALTER TABLE "wiki_entities" ADD COLUMN "locale" text DEFAULT 'zh-CN' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_slug_locale_uidx" ON "articles" USING btree ("slug","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_events_slug_locale_uidx" ON "calendar_events" USING btree ("slug","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "wiki_entities_slug_locale_uidx" ON "wiki_entities" USING btree ("slug","locale");