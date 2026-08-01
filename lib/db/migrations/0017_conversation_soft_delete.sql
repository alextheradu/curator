ALTER TABLE "conversations" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
CREATE INDEX "conversations_deleted_at_idx" ON "conversations" USING btree ("deleted_at");
