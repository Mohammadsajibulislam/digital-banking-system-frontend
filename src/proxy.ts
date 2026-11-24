import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { ROLE_HOME } from "@/lib/roles";

// Edge-safe config diye alada auth instance (database chhara)
const { auth } = NextAuth(authConfig);

// Next.js 16-e export-er nam "proxy" hote hobe (age middleware chhilo)
export const proxy = auth((req) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const user = req.auth?.user;

  const redirectTo = (to: string) =>
    NextResponse.redirect(new URL(to, nextUrl));

  // Login page: login kora thakle nijer dashboard-e pathai
  if (path === "/login") {
    return user ? redirectTo(ROLE_HOME[user.role]) : NextResponse.next();
  }

  // Baki sob page-e login lagbe
  if (!user) return redirectTo("/login");

  // Root "/" e gele nijer dashboard-e
  if (path === "/") return redirectTo(ROLE_HOME[user.role]);

  // Role onujayi area check
  // /admin = shudhu Admin, /staff = Staff ar Admin, /customer = shudhu Customer
  if (path.startsWith("/admin") && user.role !== "ADMIN") {
    return redirectTo(ROLE_HOME[user.role]);
  }
  if (path.startsWith("/staff") && user.role === "CUSTOMER") {
    return redirectTo(ROLE_HOME[user.role]);
  }
  if (path.startsWith("/customer") && user.role !== "CUSTOMER") {
    return redirectTo(ROLE_HOME[user.role]);
  }

  return NextResponse.next();
});

export const config = {
  // /api, static file ar image proxy-te dhukbe na.
  // API-r security alada, requireUser() diye hobe.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)",
  ],
};