ALTER TABLE "blog_posts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "blog_posts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "blog_posts_public_read_published" ON "blog_posts"
  FOR SELECT
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "published" = true
  );
--> statement-breakpoint
CREATE POLICY "blog_posts_admin_write" ON "blog_posts"
  FOR ALL
  USING (current_setting('app.is_admin', true) = 'true')
  WITH CHECK (current_setting('app.is_admin', true) = 'true');
