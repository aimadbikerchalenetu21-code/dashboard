import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible auth config — NO Prisma, NO Node.js crypto.
 * Only used by middleware (Vercel Edge Runtime).
 */
export const authConfig = {
  pages: {
    signIn: "/admin/login",
  },
  session: { strategy: "jwt" as const },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      // Middleware matcher excludes /admin/login already
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
