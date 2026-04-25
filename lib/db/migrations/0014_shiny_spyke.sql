CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text DEFAULT 'New project' NOT NULL,
	"icon" text DEFAULT 'folder' NOT NULL,
	"color" text DEFAULT 'teal' NOT NULL,
	"context_summary" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "matched_terms" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_user_updated_idx" ON "projects" USING btree ("user_id","updated_at");--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversations_project_id_idx" ON "conversations" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "projects_select_owner" ON "projects"
  FOR SELECT
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "user_id" = nullif(current_setting('app.user_id', true), '')
  );--> statement-breakpoint
CREATE POLICY "projects_insert_owner" ON "projects"
  FOR INSERT
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR "user_id" = nullif(current_setting('app.user_id', true), '')
  );--> statement-breakpoint
CREATE POLICY "projects_update_owner" ON "projects"
  FOR UPDATE
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "user_id" = nullif(current_setting('app.user_id', true), '')
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR "user_id" = nullif(current_setting('app.user_id', true), '')
  );--> statement-breakpoint
CREATE POLICY "projects_delete_owner" ON "projects"
  FOR DELETE
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "user_id" = nullif(current_setting('app.user_id', true), '')
  );
