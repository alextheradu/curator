import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, eq } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { withSystemDbAccess } from "@/lib/db/access";
import { DEFAULT_CHAT_MODE, readUserAccountSettings } from "@/lib/account-settings";
import { isAdminEmail } from "@/lib/admin-emails";
import { accounts, bannedEmails, sessions, users, verificationTokens } from "@/lib/db/schema";

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

        if (!payload.sub || !payload.email || !validAuds.includes(payload.aud)) return null;

        const email = payload.email.toLowerCase();

        const [ban] = await withSystemDbAccess((tx) =>
          tx.select({ email: bannedEmails.email })
            .from(bannedEmails)
            .where(eq(bannedEmails.email, email))
            .limit(1)
        );
        if (ban) return null;

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
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (existingUser) {
            userId = existingUser.id;
          } else {
            userId = crypto.randomUUID();
            await db.insert(authAdapterUsers).values({
              id: userId,
              email,
              name: payload.name ?? null,
              image: payload.picture ?? null,
              emailVerified: payload.email_verified === "true" ? new Date() : null,
            });
          }

          await db.insert(accounts).values({
            userId,
            type: "oidc",
            provider: "google",
            providerAccountId: payload.sub,
          }).onConflictDoNothing();
        }

        return { id: userId, email, name: payload.name ?? null, image: payload.picture ?? null };
      },
    }),
    ...(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET
      ? [
          Apple({
            clientId: process.env.AUTH_APPLE_ID,
            clientSecret: process.env.AUTH_APPLE_SECRET,
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

      const [ban] = await withSystemDbAccess((tx) => tx
        .select({ email: bannedEmails.email })
        .from(bannedEmails)
        .where(eq(bannedEmails.email, normalizedEmail))
        .limit(1));

      return !ban;
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

      const shouldRefreshAccountSettings = Boolean(
        token.id
        && (
          user
          || trigger === "update"
          || token.onboardedAt == null
          || token.tosAcceptedAt === undefined
          || token.defaultChatMode == null
        )
      );

      if (shouldRefreshAccountSettings && token.id) {
        const settings = await readUserAccountSettings(token.id as string);
        token.isAdmin = settings.isAdmin;
        token.defaultChatMode = settings.defaultChatMode;
        token.preferredName = settings.preferredName;
        token.teamNumber = settings.teamNumber;
        token.onboardedAt = settings.onboardedAt;
        token.tosAcceptedAt = settings.tosAcceptedAt;
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
