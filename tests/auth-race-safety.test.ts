import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// auth.ts pulls in lib/db, which opens a real Postgres connection at import
// time - there's no DB test harness in this repo to safely exercise
// authorize() end-to-end, so these assert against the source directly
// (same approach as native-pwa-runtime.test.ts) rather than executing it.
const root = path.resolve(__dirname, "..");
const authSource = readFileSync(path.join(root, "auth.ts"), "utf8");

function providerBlock(id: "google-id-token" | "apple-id-token") {
  const start = authSource.indexOf(`id: "${id}"`);
  expect(start).toBeGreaterThan(-1);
  const nextProviderStart = authSource.indexOf('id: "', start + 1);
  return authSource.slice(start, nextProviderStart === -1 ? undefined : nextProviderStart);
}

describe("native sign-in user/account creation race safety", () => {
  it.each(["google-id-token", "apple-id-token"] as const)(
    "wraps %s user creation and account linking in one DB transaction",
    (id) => {
      const block = providerBlock(id);
      const transactionIndex = block.indexOf("db.transaction(");
      const userInsertIndex = block.indexOf("tx.insert(authAdapterUsers)");
      const accountInsertIndex = block.indexOf("tx.insert(accounts)");

      expect(transactionIndex).toBeGreaterThan(-1);
      expect(userInsertIndex).toBeGreaterThan(transactionIndex);
      expect(accountInsertIndex).toBeGreaterThan(userInsertIndex);
    }
  );

  it.each(["google-id-token", "apple-id-token"] as const)(
    "recovers %s from a concurrent user-creation race instead of surfacing a spurious auth error",
    (id) => {
      const block = providerBlock(id);
      const insertIndex = block.indexOf("tx.insert(authAdapterUsers)");
      const catchIndex = block.indexOf("} catch (err) {", insertIndex);
      const raceSelectIndex = block.indexOf("const [raceWinner]", catchIndex);
      const raceGuardIndex = block.indexOf("if (!raceWinner)", raceSelectIndex);
      const recoveredAssignmentIndex = block.indexOf("resolvedUserId = raceWinner.id", raceGuardIndex);

      expect(catchIndex).toBeGreaterThan(insertIndex);
      expect(raceSelectIndex).toBeGreaterThan(catchIndex);
      // Only rethrow (and fail the sign-in) when there's truly no row to
      // recover from - otherwise link to the account the concurrent request
      // just created.
      expect(raceGuardIndex).toBeGreaterThan(raceSelectIndex);
      expect(recoveredAssignmentIndex).toBeGreaterThan(raceGuardIndex);
    }
  );

  it.each(["google-id-token", "apple-id-token"] as const)(
    "account link insert is idempotent (onConflictDoNothing) for %s",
    (id) => {
      const block = providerBlock(id);
      const accountInsertIndex = block.indexOf("tx.insert(accounts)");
      const conflictIndex = block.indexOf("onConflictDoNothing()", accountInsertIndex);

      expect(accountInsertIndex).toBeGreaterThan(-1);
      expect(conflictIndex).toBeGreaterThan(accountInsertIndex);
    }
  );
});
