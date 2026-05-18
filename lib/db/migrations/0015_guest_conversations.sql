ALTER TABLE "conversations" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "guest_id" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_owner_check"
  CHECK ("user_id" IS NOT NULL OR "guest_id" IS NOT NULL);--> statement-breakpoint
CREATE INDEX "conversations_guest_id_idx" ON "conversations" ("guest_id");
