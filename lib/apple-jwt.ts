import { createRemoteJWKSet, jwtVerify } from "jose";

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

// Sign in with Apple tokens (identity tokens and server-to-server
// notification payloads) are both JWTs signed by Apple and share the same
// iss/aud shape, so both verification paths go through this helper.
//
// The audience differs by platform: iOS native sign-in uses the app's
// bundle ID / App ID, while Android's WebView OAuth flow (and the web
// flow, if ever moved off the full OAuth provider) uses a separate Apple
// Services ID. Accept either.
export async function verifyAppleJwt(token: string) {
  const audience = [
    process.env.AUTH_APPLE_IOS_CLIENT_ID,
    process.env.NEXT_PUBLIC_AUTH_APPLE_ANDROID_CLIENT_ID,
  ].filter((value): value is string => Boolean(value));

  if (audience.length === 0) return null;

  try {
    const { payload } = await jwtVerify(token, APPLE_JWKS, {
      issuer: APPLE_ISSUER,
      audience,
    });
    return payload;
  } catch {
    return null;
  }
}
