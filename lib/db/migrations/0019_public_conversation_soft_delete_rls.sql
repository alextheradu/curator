-- A soft-deleted conversation must stop being readable through the "public"
-- branch of the RLS policies immediately. Previously is_public = true admitted
-- rows regardless of deleted_at, so any signed-in user who knew the UUID of a
-- deleted shared chat could still read it for the whole trash window.

DROP POLICY IF EXISTS "conversations_select_visible" ON "conversations";--> statement-breakpoint
CREATE POLICY "conversations_select_visible" ON "conversations"
  FOR SELECT
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR ("is_public" = true AND "deleted_at" IS NULL)
    OR "user_id" = nullif(current_setting('app.user_id', true), '')
  );--> statement-breakpoint

DROP POLICY IF EXISTS "messages_select_visible" ON "messages";--> statement-breakpoint
CREATE POLICY "messages_select_visible" ON "messages"
  FOR SELECT
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR EXISTS (
      SELECT 1
      FROM "conversations"
      WHERE "conversations"."id" = "messages"."conversation_id"
        AND (
          ("conversations"."is_public" = true AND "conversations"."deleted_at" IS NULL)
          OR "conversations"."user_id" = nullif(current_setting('app.user_id', true), '')
        )
    )
  );
