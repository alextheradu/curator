CREATE TYPE "public"."app_log_level" AS ENUM('info', 'warn', 'error');--> statement-breakpoint
CREATE TYPE "public"."support_request_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "app_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" "app_log_level" DEFAULT 'info' NOT NULL,
	"source" text NOT NULL,
	"message" text NOT NULL,
	"path" text,
	"user_id" text,
	"ip" text,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"key" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"name" text,
	"email" text,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"page_path" text,
	"user_agent" text,
	"ip" text,
	"status" "support_request_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_logs" ADD CONSTRAINT "app_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "app_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "support_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "app_logs_admin_read" ON "app_logs"
  FOR SELECT
  USING (current_setting('app.is_admin', true) = 'true');--> statement-breakpoint
CREATE POLICY "app_logs_insert_any" ON "app_logs"
  FOR INSERT
  WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "support_requests_admin_read" ON "support_requests"
  FOR SELECT
  USING (current_setting('app.is_admin', true) = 'true');--> statement-breakpoint
CREATE POLICY "support_requests_insert_any" ON "support_requests"
  FOR INSERT
  WITH CHECK (true);
