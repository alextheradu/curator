import { createRemoteJWKSet, jwtVerify } from "jose";

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

// Sign in with Apple tokens (identity tokens and server-to-server
// notification payloads) are both JWTs signed by Apple and share the same
// iss/aud shape, so both verification paths go through this helper.
export async function verifyAppleJwt(token: string) {
  const audience = process.env.AUTH_APPLE_IOS_CLIENT_ID;
  if (!audience) return null;

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
