import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { DEFAULT_CHAT_MODE, readUserAccountSettings } from "@/lib/account-settings";
import { accounts, sessions, verificationTokens } from "@/lib/db/schema";

type GoogleProfile = {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  email_verified?: boolean;
};

function isAdminEmail(email?: string | null) {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .includes((email ?? "").toLowerCase());
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
  ],
  session: { strategy: "jwt" },
  callbacks: {
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
      }

      const shouldRefreshAccountSettings = Boolean(
        token.id
        && (
          user
          || trigger === "update"
          || token.onboardedAt == null
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
      }
      return session;
    },
  },
  pages: { signIn: "/" },
});
