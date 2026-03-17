import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Match all /admin routes EXCEPT /admin/login
  matcher: ["/admin/((?!login$).*)"],
};
