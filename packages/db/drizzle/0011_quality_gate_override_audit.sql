ALTER TABLE "articles" ADD COLUMN "quality_gate_override_events" jsonb DEFAULT '[]'::jsonb NOT NULL;
