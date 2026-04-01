ALTER TABLE "campaigns" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "budget" double precision;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "pending_messages_queue" ADD COLUMN "claimed_at" timestamp;