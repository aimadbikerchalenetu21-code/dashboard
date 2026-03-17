import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { z } from "zod";
import { createHash, timingSafeEqual } from "crypto";
import { authConfig } from "@/auth.config";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

/**
 * Verifies a password against a SHA-256 hex hash (timing-safe).
 * Hash format: plain 64-char hex OR "sha256:<hex>".
 * To use bcrypt: npm install bcryptjs @types/bcryptjs and extend this function.
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const inputHash = createHash("sha256").update(password).digest("hex");
    const normalizedHash = hash.startsWith("sha256:") ? hash.slice(7) : hash;
    const expected = Buffer.from(normalizedHash, "hex");
    const actual = Buffer.from(inputHash, "hex");
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Check env-based admin first (works before DB is seeded)
        const envAdminEmail = process.env.ADMIN_EMAIL;
        const envAdminHash = process.env.ADMIN_PASSWORD_HASH;
        if (
          envAdminEmail &&
          envAdminHash &&
          email === envAdminEmail &&
          (await verifyPassword(password, envAdminHash))
        ) {
          return { id: "env-admin", email, name: "Admin", role: "admin" };
        }

        // Check DB users
        const user = await db.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) token.role = (user as { role?: string }).role ?? "admin";
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as { role?: string }).role = token.role as string;
      return session;
    },
  },
});
