import type { NextAuthConfig } from "next-auth";
import type { AppRole } from "@/lib/roles";

// Ei file-e shudhu "edge-safe" jinis thake (database/bcrypt na),
// karon proxy.ts eta use kore.
export const authConfig = {
  pages: { signIn: "/login" },
  session: {
    strategy: "jwt",
    maxAge: 60 * 30, // banking app, tai 30 minute-er session
  },
  providers: [],
  callbacks: {
    // Login-er shomoy token-e id ar role boshai
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    // Token theke session-e nei, jate server/client-e session.user.role pai.
    // Token-er value TypeScript-er kache unknown, tai type bole dichchi.
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as AppRole;
      return session;
    },
  },
} satisfies NextAuthConfig;