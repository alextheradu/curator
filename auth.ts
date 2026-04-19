import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
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
    async jwt({ token, user, trigger }) {
      if (user) token.id = user.id;
      const email = user?.email ?? token.email;

      // Superadmin always wins — no DB check needed
      if (isAdminEmail(email)) {
        token.isAdmin = true;
        token.isSuperAdmin = true;
        return token;
      }

      // Check DB admin flag on sign-in or explicit update trigger
      if ((user || trigger === "update") && token.id) {
        const [row] = await db
          .select({ isAdmin: users.isAdmin })
          .from(users)
          .where(eq(users.id, token.id as string))
          .limit(1);
        token.isAdmin = row?.isAdmin ?? false;
      }

      token.isSuperAdmin = false;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.isAdmin = Boolean(token.isAdmin);
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin);
      }
      return session;
    },
  },
  pages: { signIn: "/" },
});
