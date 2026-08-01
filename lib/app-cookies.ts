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
export const GUEST_MESSAGE_LIMIT = 3;

export const GUEST_SESSION_ID_COOKIE_NAME = "guest_session_id";
export const GUEST_SESSION_MAX_AGE = 60 * 60 * 24 * 90; // 90 days
