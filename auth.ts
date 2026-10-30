import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, eq } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { verifyAppleJwt } from "@/lib/apple-jwt";
import { isEmailBanned } from "@/lib/ban-check";
import { DEFAULT_CHAT_MODE, readUserAccountSettings } from "@/lib/account-settings";
import { isAdminEmail } from "@/lib/admin-emails";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";

type GoogleProfile = {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  email_verified?: boolean;
};

type AppleProfile = {
  sub: string;
  email?: string;
  email_verified?: boolean | string;
  // Apple only sends `name` on the very first sign-in
  name?: { firstName?: string; lastName?: string };
};

// The JWT is sliding (re-signed with a fresh expiry on every session read), so
// without a periodic re-read a revoked isAdmin claim would live forever. Admin
// claims are re-checked often; ordinary account settings less so.
const ADMIN_CLAIM_REFRESH_MS = 60 * 1000;
const ACCOUNT_CLAIM_REFRESH_MS = 5 * 60 * 1000;

/**
 * Native (id-token) sign-in resolves the account by the provider's stable
 * `sub`, so the email in the incoming token may differ from the email stored
 * on the user row. Bans are enforced against the stored account - and the
 * stored email becomes the session email - so changing the provider-side
 * address cannot route around a ban.
 */
async function resolveNativeSignInUser(userId: string, tokenEmail: string) {
  const [user] = await db
    .select({
      email: users.email,
      emailBanned: users.emailBanned,
      name: users.name,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.emailBanned) return null;

  const storedEmail = user.email.toLowerCase();
  if (await isEmailBanned(storedEmail)) return null;
  if (storedEmail !== tokenEmail && await isEmailBanned(tokenEmail)) return null;

  return { id: userId, email: storedEmail, name: user.name ?? null, image: user.image ?? null };
}

// Keep Auth.js compatible with live databases that have not applied newer
// app-specific columns on `users` yet.
const authAdapterUsers = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: authAdapterUsers,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      // Safe here specifically because every account in this DB - including
      // the native Credentials flows below - only ever gets created from a
      // provider-verified email (no password/unverified signup path exists
      // at all). Without this, someone who signed up with Google and later
      // taps "Sign in with Apple" using the same email gets a hard
      // OAuthAccountNotLinked error instead of landing in their own account.
      allowDangerousEmailAccountLinking: true,
      profile(profile: GoogleProfile) {
        return {
          id: profile.sub,
          name: profile.name ?? null,
          email: profile.email?.toLowerCase() ?? null,
          image: profile.picture ?? null,
          emailVerified: profile.email_verified ? new Date() : null,
        };
      },
    }),
    // Native iOS Google Sign-In: receives an idToken from the device,
    // verifies it with Google, then finds or creates the user in the DB.
    Credentials({
      id: "google-id-token",
      credentials: { idToken: {} },
      async authorize(credentials) {
        const idToken = credentials?.idToken;
        if (typeof idToken !== "string" || !idToken) return null;

        const res = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
        );
        if (!res.ok) return null;

        const payload = await res.json() as {
          sub?: string; email?: string; email_verified?: string;
          name?: string; picture?: string; aud?: string;
        };

        const validAuds = [
          process.env.AUTH_GOOGLE_ID,
          process.env.AUTH_GOOGLE_IOS_CLIENT_ID,
        ].filter(Boolean);

        if (
          !payload.sub
          || !payload.email
          || payload.email_verified !== "true"
          || !validAuds.includes(payload.aud)
        ) {
          return null;
        }

        const email = payload.email.toLowerCase();

        if (await isEmailBanned(email)) return null;

        // Find existing account link → user
        const [existingAccount] = await db
          .select({ userId: accounts.userId })
          .from(accounts)
          .where(and(eq(accounts.provider, "google"), eq(accounts.providerAccountId, payload.sub)))
          .limit(1);

        let userId: string;

        if (existingAccount) {
          userId = existingAccount.userId;
        } else {
          // Find by email or create user
          const [existingUser] = await db
            .select({ id: users.id, emailVerified: users.emailVerified })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (existingUser && !existingUser.emailVerified) {
            const [linkedGoogleAccount] = await db
              .select({ userId: accounts.userId })
              .from(accounts)
              .where(and(eq(accounts.userId, existingUser.id), eq(accounts.provider, "google")))
              .limit(1);

            if (!linkedGoogleAccount) {
              return null;
            }
          }

          // User creation + account link run in one transaction so a
          // mid-sequence failure can't leave a user row with no linked
          // account. The users.email unique constraint also means two
          // concurrent first-time sign-ins for the same address can race
          // here: if this insert loses that race, the transaction catches
          // the unique violation and links to the account the other
          // request just created instead of surfacing a spurious auth
          // error.
          userId = await db.transaction(async (tx) => {
            let resolvedUserId = existingUser?.id;

            if (!resolvedUserId) {
              resolvedUserId = crypto.randomUUID();
              try {
                await tx.insert(authAdapterUsers).values({
                  id: resolvedUserId,
                  email,
                  name: payload.name ?? null,
                  image: payload.picture ?? null,
                  emailVerified: payload.email_verified === "true" ? new Date() : null,
                });
              } catch (err) {
                const [raceWinner] = await tx
                  .select({ id: users.id })
                  .from(users)
                  .where(eq(users.email, email))
                  .limit(1);
                if (!raceWinner) {
                  console.error("[auth] google-id-token: user insert failed and no concurrent row to recover from");
                  throw err;
                }
                console.warn("[auth] google-id-token: recovered from a concurrent user-creation race");
                resolvedUserId = raceWinner.id;
              }
            }

            await tx.insert(accounts).values({
              userId: resolvedUserId,
              type: "oidc",
              provider: "google",
              providerAccountId: payload.sub as string,
            }).onConflictDoNothing();

            return resolvedUserId;
          });
        }

        const resolved = await resolveNativeSignInUser(userId, email);
        if (!resolved) return null;

        return {
          ...resolved,
          name: resolved.name ?? payload.name ?? null,
          image: resolved.image ?? payload.picture ?? null,
        };
      },
    }),
    // Native iOS Sign in with Apple: receives an idToken from the device,
    // verifies it against Apple's JWKS, then finds or creates the user in
    // the DB. Shares the "apple" provider/providerAccountId space with the
    // web Apple OAuth provider below, keyed by Apple's stable `sub`.
    Credentials({
      id: "apple-id-token",
      credentials: { idToken: {}, nonce: {}, firstName: {}, lastName: {} },
      async authorize(credentials) {
        const idToken = credentials?.idToken;
        if (typeof idToken !== "string" || !idToken) return null;

        const payload = await verifyAppleJwt(idToken);
        if (!payload) return null;

        const nonce = typeof credentials?.nonce === "string" ? credentials.nonce : "";
        if (!nonce || payload.nonce !== nonce) return null;

        const sub = payload.sub;
        const emailVerified =
          payload.email_verified === true || payload.email_verified === "true";
        const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;

        if (!sub || !email || !emailVerified) return null;
        if (await isEmailBanned(email)) return null;

        const [existingAccount] = await db
          .select({ userId: accounts.userId })
          .from(accounts)
          .where(and(eq(accounts.provider, "apple"), eq(accounts.providerAccountId, sub)))
          .limit(1);

        let userId: string;

        if (existingAccount) {
          userId = existingAccount.userId;
        } else {
          const [existingUser] = await db
            .select({ id: users.id, emailVerified: users.emailVerified })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (existingUser && !existingUser.emailVerified) {
            const [linkedAppleAccount] = await db
              .select({ userId: accounts.userId })
              .from(accounts)
              .where(and(eq(accounts.userId, existingUser.id), eq(accounts.provider, "apple")))
              .limit(1);

            if (!linkedAppleAccount) {
              return null;
            }
          }

          // See the matching comment on the google-id-token provider above -
          // same transactional/race-safe reasoning applies symmetrically.
          userId = await db.transaction(async (tx) => {
            let resolvedUserId = existingUser?.id;

            if (!resolvedUserId) {
              // Apple only sends the user's name on the device's very first
              // authorization, so the client passes it through here.
              const firstName = typeof credentials?.firstName === "string" ? credentials.firstName : "";
              const lastName = typeof credentials?.lastName === "string" ? credentials.lastName : "";
              const name = `${firstName} ${lastName}`.trim() || null;

              resolvedUserId = crypto.randomUUID();
              try {
                await tx.insert(authAdapterUsers).values({
                  id: resolvedUserId,
                  email,
                  name,
                  image: null,
                  emailVerified: new Date(),
                });
              } catch (err) {
                const [raceWinner] = await tx
                  .select({ id: users.id })
                  .from(users)
                  .where(eq(users.email, email))
                  .limit(1);
                if (!raceWinner) {
                  console.error("[auth] apple-id-token: user insert failed and no concurrent row to recover from");
                  throw err;
                }
                console.warn("[auth] apple-id-token: recovered from a concurrent user-creation race");
                resolvedUserId = raceWinner.id;
              }
            }

            await tx.insert(accounts).values({
              userId: resolvedUserId,
              type: "oidc",
              provider: "apple",
              providerAccountId: sub,
            }).onConflictDoNothing();

            return resolvedUserId;
          });
        }

        return resolveNativeSignInUser(userId, email);
      },
    }),
    ...(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET
      ? [
          Apple({
            clientId: process.env.AUTH_APPLE_ID,
            clientSecret: process.env.AUTH_APPLE_SECRET,
            // See the matching comment on the Google provider above - same
            // reasoning applies symmetrically.
            allowDangerousEmailAccountLinking: true,
            profile(profile: AppleProfile) {
              const firstName = profile.name?.firstName ?? "";
              const lastName = profile.name?.lastName ?? "";
              const fullName = `${firstName} ${lastName}`.trim() || null;
              const verified =
                profile.email_verified === true || profile.email_verified === "true";
              return {
                id: profile.sub,
                name: fullName,
                email: profile.email?.toLowerCase() ?? null,
                image: null,
                emailVerified: verified ? new Date() : null,
              };
            },
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      const normalizedEmail = user.email?.toLowerCase();
      if (!normalizedEmail) {
        return false;
      }

      return !(await isEmailBanned(normalizedEmail));
    },
    async jwt({ token, user, trigger, session }) {
      if (user) token.id = user.id;
      const email = user?.email ?? token.email;

      if (trigger === "update" && session && token.id) {
        if ("defaultChatMode" in session) {
          token.defaultChatMode = session.defaultChatMode ?? DEFAULT_CHAT_MODE;
        }
        if ("preferredName" in session) {
          token.preferredName = typeof session.preferredName === "string" ? session.preferredName : null;
        }
        if ("teamNumber" in session) {
          token.teamNumber = typeof session.teamNumber === "number" ? session.teamNumber : null;
        }
        if ("onboardedAt" in session) {
          token.onboardedAt = session.onboardedAt ? new Date(session.onboardedAt) : null;
        }
        if ("tosAcceptedAt" in session) {
          token.tosAcceptedAt = session.tosAcceptedAt ? new Date(session.tosAcceptedAt) : null;
        }
      }

      const now = Date.now();
      const checkedAt = typeof token.settingsCheckedAt === "number" ? token.settingsCheckedAt : 0;
      const refreshAfterMs = token.isAdmin ? ADMIN_CLAIM_REFRESH_MS : ACCOUNT_CLAIM_REFRESH_MS;
      const shouldRefreshAccountSettings = Boolean(
        token.id
        && (
          user
          || trigger === "update"
          || token.onboardedAt == null
          || token.tosAcceptedAt === undefined
          || token.defaultChatMode == null
          || now - checkedAt > refreshAfterMs
        )
      );

      if (shouldRefreshAccountSettings && token.id) {
        const settings = await readUserAccountSettings(token.id as string);
        // The account was deleted (by the user or an admin) while this token
        // was still valid: returning null ends the session.
        if (!settings.exists) return null;

        token.isAdmin = settings.isAdmin;
        token.defaultChatMode = settings.defaultChatMode;
        token.preferredName = settings.preferredName;
        token.teamNumber = settings.teamNumber;
        token.onboardedAt = settings.onboardedAt;
        token.tosAcceptedAt = settings.tosAcceptedAt;
        token.settingsCheckedAt = now;
      }

      if (isAdminEmail(email)) {
        token.isAdmin = true;
        token.isSuperAdmin = true;
        token.defaultChatMode ??= DEFAULT_CHAT_MODE;
        return token;
      }

      token.isSuperAdmin = false;
      token.defaultChatMode ??= DEFAULT_CHAT_MODE;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.isAdmin = Boolean(token.isAdmin);
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin);
        session.user.defaultChatMode =
          (token.defaultChatMode as "rookie" | "veteran" | undefined) ?? DEFAULT_CHAT_MODE;
        session.user.preferredName = typeof token.preferredName === "string" ? token.preferredName : null;
        session.user.teamNumber = typeof token.teamNumber === "number" ? token.teamNumber : null;
        session.user.onboardedAt = token.onboardedAt
          ? new Date(token.onboardedAt as Date | string)
          : null;
        session.user.tosAcceptedAt = token.tosAcceptedAt
          ? new Date(token.tosAcceptedAt as Date | string)
          : null;
      }
      return session;
    },
  },
  pages: { signIn: "/" },
});
