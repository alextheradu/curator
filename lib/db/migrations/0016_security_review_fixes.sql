ALTER TABLE "projects" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Application transactions set set_config('app.guest_id', ...) before guest policies run.

CREATE POLICY "conversations_select_guest" ON "conversations"
  FOR SELECT
  USING (
    "guest_id" = nullif(current_setting('app.guest_id', true), '')
  );--> statement-breakpoint
CREATE POLICY "conversations_insert_guest" ON "conversations"
  FOR INSERT
  WITH CHECK (
    "user_id" IS NULL
    AND "guest_id" = nullif(current_setting('app.guest_id', true), '')
  );--> statement-breakpoint
CREATE POLICY "conversations_update_guest" ON "conversations"
  FOR UPDATE
  USING (
    "guest_id" = nullif(current_setting('app.guest_id', true), '')
  )
  WITH CHECK (
    (
      "user_id" IS NULL
      AND "guest_id" = nullif(current_setting('app.guest_id', true), '')
    )
    OR (
      "user_id" = nullif(current_setting('app.user_id', true), '')
      AND "guest_id" IS NULL
    )
  );--> statement-breakpoint
CREATE POLICY "conversations_delete_guest" ON "conversations"
  FOR DELETE
  USING (
    "guest_id" = nullif(current_setting('app.guest_id', true), '')
  );--> statement-breakpoint

CREATE POLICY "messages_select_guest" ON "messages"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM "conversations"
      WHERE "conversations"."id" = "messages"."conversation_id"
        AND "conversations"."guest_id" = nullif(current_setting('app.guest_id', true), '')
    )
  );--> statement-breakpoint
CREATE POLICY "messages_insert_guest" ON "messages"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "conversations"
      WHERE "conversations"."id" = "messages"."conversation_id"
        AND "conversations"."guest_id" = nullif(current_setting('app.guest_id', true), '')
    )
  );--> statement-breakpoint

CREATE POLICY "support_requests_select_owner" ON "support_requests"
  FOR SELECT
  USING (
    "user_id" = nullif(current_setting('app.user_id', true), '')
  );--> statement-breakpoint

CREATE OR REPLACE FUNCTION cleanup_expired_guest_conversations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  delete from "conversations"
  where guest_id is not null
    and created_at < now() - interval '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  return deleted_count;
END;
$$;
