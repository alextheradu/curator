/**
 * Chat mode (Rookie/Veteran) is a single account-wide setting - see the
 * Settings > Personalization rows and the onboarding chat-mode step, both of
 * which write straight to `useChatStore`'s `defaultChatMode` and persist to
 * the account asynchronously (see SettingsModal's `saveAccountChatMode` and
 * OnboardingModal's `handleComplete`). Once a session starts, the store is
 * the live source of truth for what the UI shows and what new messages send.
 *
 * `useSession()` re-validates on window/app focus. If the local store were
 * re-seeded from `session.user.defaultChatMode` on every one of those
 * refreshes, a selection the user just made would get silently reverted
 * whenever the JWT hasn't picked up the write yet - e.g. the account PATCH
 * succeeded but the follow-up `update()` call dropped on a flaky connection,
 * which is a real possibility on the "competition Wi-Fi" this app targets.
 *
 * So the store is only reseeded from the account once per signed-in user:
 * on the transition into a session for that user id. Every later session
 * refresh for the same user id is a no-op here; the store stays
 * authoritative (and the explicit save flows keep the backend in sync)
 * until the user signs into a different account.
 */
export function shouldSyncAccountChatMode(
  previouslySyncedUserId: string | null,
  currentUserId: string | null,
): boolean {
  return currentUserId != null && currentUserId !== previouslySyncedUserId;
}
