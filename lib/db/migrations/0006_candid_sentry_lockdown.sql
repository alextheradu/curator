ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "doc_chunks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "conversations_select_visible" ON "conversations"
  FOR SELECT
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "is_public" = true
    OR "user_id" = nullif(current_setting('app.user_id', true), '')
  );--> statement-breakpoint
CREATE POLICY "conversations_insert_owner" ON "conversations"
  FOR INSERT
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR "user_id" = nullif(current_setting('app.user_id', true), '')
  );--> statement-breakpoint
CREATE POLICY "conversations_update_owner" ON "conversations"
  FOR UPDATE
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "user_id" = nullif(current_setting('app.user_id', true), '')
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR "user_id" = nullif(current_setting('app.user_id', true), '')
  );--> statement-breakpoint
CREATE POLICY "conversations_delete_owner" ON "conversations"
  FOR DELETE
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "user_id" = nullif(current_setting('app.user_id', true), '')
  );--> statement-breakpoint
CREATE POLICY "messages_select_visible" ON "messages"
  FOR SELECT
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR EXISTS (
      SELECT 1
      FROM "conversations"
      WHERE "conversations"."id" = "messages"."conversation_id"
        AND (
          "conversations"."is_public" = true
          OR "conversations"."user_id" = nullif(current_setting('app.user_id', true), '')
        )
    )
  );--> statement-breakpoint
CREATE POLICY "messages_insert_owner" ON "messages"
  FOR INSERT
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR EXISTS (
      SELECT 1
      FROM "conversations"
      WHERE "conversations"."id" = "messages"."conversation_id"
        AND "conversations"."user_id" = nullif(current_setting('app.user_id', true), '')
    )
  );--> statement-breakpoint
CREATE POLICY "messages_delete_owner" ON "messages"
  FOR DELETE
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR EXISTS (
      SELECT 1
      FROM "conversations"
      WHERE "conversations"."id" = "messages"."conversation_id"
        AND "conversations"."user_id" = nullif(current_setting('app.user_id', true), '')
    )
  );--> statement-breakpoint
CREATE POLICY "reports_select_visible" ON "reports"
  FOR SELECT
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "reported_by_id" = nullif(current_setting('app.user_id', true), '')
  );--> statement-breakpoint
CREATE POLICY "reports_insert_owner" ON "reports"
  FOR INSERT
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "reported_by_id" = nullif(current_setting('app.user_id', true), '')
      AND EXISTS (
        SELECT 1
        FROM "messages"
        WHERE "messages"."id" = "reports"."message_id"
      )
    )
  );--> statement-breakpoint
CREATE POLICY "reports_update_admin" ON "reports"
  FOR UPDATE
  USING (current_setting('app.is_admin', true) = 'true')
  WITH CHECK (current_setting('app.is_admin', true) = 'true');--> statement-breakpoint
CREATE POLICY "documents_admin_read" ON "documents"
  FOR SELECT
  USING (current_setting('app.is_admin', true) = 'true');--> statement-breakpoint
CREATE POLICY "documents_admin_write" ON "documents"
  FOR ALL
  USING (current_setting('app.is_admin', true) = 'true')
  WITH CHECK (current_setting('app.is_admin', true) = 'true');--> statement-breakpoint
CREATE POLICY "doc_chunks_admin_read" ON "doc_chunks"
  FOR SELECT
  USING (current_setting('app.is_admin', true) = 'true');--> statement-breakpoint
CREATE POLICY "doc_chunks_admin_write" ON "doc_chunks"
  FOR ALL
  USING (current_setting('app.is_admin', true) = 'true')
  WITH CHECK (current_setting('app.is_admin', true) = 'true');
