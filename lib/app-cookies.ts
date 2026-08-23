export const COOKIE_CONSENT_NAME = "cookie_consent";
export const COOKIE_CONSENT_STORAGE_KEY = "curator:cookie-consent";
export const COOKIE_CONSENT_MAX_AGE = 60 * 60 * 24 * 180;
export const SIDEBAR_COOKIE_NAME = "sidebar_state";
export const SIDEBAR_WIDTH_COOKIE_NAME = "sidebar_width";
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export const TOS_ACCEPTED_COOKIE_NAME = "tos_accepted";
// Set client-side the moment someone confirms they're 13+ in the age gate,
// before the OAuth redirect fires. A year is long enough not to re-nag
// returning users, short enough that it isn't effectively permanent.
export const AGE_CONFIRMED_COOKIE_NAME = "age_confirmed_13plus";
export const AGE_CONFIRMED_MAX_AGE = 60 * 60 * 24 * 365;
export const GUEST_MESSAGE_COUNT_COOKIE_NAME = "guest_message_count";
// App Store 5.1.1(v): chat is not account-based, so guests must never be
// permanently walled off behind sign-in. This is a recurring daily quota
// (resets on a rolling 24h window), not a lifetime cap - a guest who hits it
// can just keep using the app for free the next day without ever registering.
// Signing in only raises the limit (see the "chat" rate-limit scope in
// app/api/chat/route.ts), it's never required to use the feature at all.
export const GUEST_MESSAGE_LIMIT = 15;
export const GUEST_MESSAGE_QUOTA_WINDOW_MS = 60 * 60 * 24 * 1000; // 24h, rolling

export const GUEST_SESSION_ID_COOKIE_NAME = "guest_session_id";
export const GUEST_SESSION_MAX_AGE = 60 * 60 * 24 * 90; // 90 days
