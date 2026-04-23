CREATE TYPE "public"."report_source" AS ENUM('user_report', 'auto_moderation');--> statement-breakpoint
CREATE TABLE "banned_emails" (
	"email" text PRIMARY KEY NOT NULL,
	"reason" text,
	"banned_at" timestamp DEFAULT now() NOT NULL,
	"banned_by_id" text
);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned_email" text;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "source" "report_source" DEFAULT 'user_report' NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "matched_terms" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "reported_by_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT "reports_reported_by_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_by_id_users_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banned_emails" ADD CONSTRAINT "banned_emails_banned_by_id_users_id_fk" FOREIGN KEY ("banned_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
INSERT INTO "banned_emails" ("email", "reason", "banned_at", "banned_by_id")
SELECT lower("users"."email"), "banned_ips"."reason", coalesce("banned_ips"."banned_at", now()), "banned_ips"."banned_by_id"
FROM "users"
LEFT JOIN "banned_ips" ON "banned_ips"."ip" = "users"."banned_ip"
WHERE "users"."ip_banned" = true
ON CONFLICT ("email") DO NOTHING;--> statement-breakpoint
UPDATE "users"
SET
	"email_banned" = "ip_banned",
	"banned_email" = CASE WHEN "ip_banned" THEN lower("email") ELSE NULL END;--> statement-breakpoint
ALTER TABLE "banned_emails" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "banned_emails" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "banned_emails_read_operational" ON "banned_emails"
  FOR SELECT
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR current_setting('app.is_system', true) = 'true'
  );--> statement-breakpoint
CREATE POLICY "banned_emails_write_operational" ON "banned_emails"
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR current_setting('app.is_system', true) = 'true'
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR current_setting('app.is_system', true) = 'true'
  );--> statement-breakpoint
DROP TABLE "banned_ips" CASCADE;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "ip_banned";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "banned_ip";
