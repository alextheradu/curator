import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(process.cwd(), "lib/db/migrations/0016_security_review_fixes.sql");

describe("security review migration", () => {
  it("adds guest-aware RLS, project force RLS, support export policy, and guest cleanup", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("set_config('app.guest_id'");
    expect(sql).toContain('CREATE POLICY "conversations_select_guest"');
    expect(sql).toContain('CREATE POLICY "messages_insert_guest"');
    expect(sql).toContain('ALTER TABLE "projects" FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('CREATE POLICY "support_requests_select_owner"');
    expect(sql).toContain('delete from "conversations"');
    expect(sql).toContain('guest_id is not null');
    expect(sql).toContain("interval '90 days'");
  });
});
