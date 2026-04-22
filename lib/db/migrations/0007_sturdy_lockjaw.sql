ALTER TABLE "conversations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reports" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "documents" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "doc_chunks" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "support_requests" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "banned_ips" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "banned_ips" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rate_limit_buckets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rate_limit_buckets" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

DROP POLICY "app_logs_insert_any" ON "app_logs";--> statement-breakpoint
CREATE POLICY "app_logs_insert_system" ON "app_logs"
  FOR INSERT
  WITH CHECK (current_setting('app.is_system', true) = 'true');--> statement-breakpoint

DROP POLICY "support_requests_insert_any" ON "support_requests";--> statement-breakpoint
CREATE POLICY "support_requests_insert_actor" ON "support_requests"
  FOR INSERT
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR "user_id" = nullif(current_setting('app.user_id', true), '')
    OR ("user_id" IS NULL AND nullif(current_setting('app.user_id', true), '') IS NULL)
  );--> statement-breakpoint

CREATE POLICY "banned_ips_read_operational" ON "banned_ips"
  FOR SELECT
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR current_setting('app.is_system', true) = 'true'
  );--> statement-breakpoint
CREATE POLICY "banned_ips_write_operational" ON "banned_ips"
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR current_setting('app.is_system', true) = 'true'
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR current_setting('app.is_system', true) = 'true'
  );--> statement-breakpoint

CREATE POLICY "rate_limit_buckets_system_only" ON "rate_limit_buckets"
  FOR ALL
  USING (current_setting('app.is_system', true) = 'true')
  WITH CHECK (current_setting('app.is_system', true) = 'true');
