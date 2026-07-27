import { NextResponse, type NextRequest } from "next/server";

// Optimistic cookie-presence check only — cheap, no DB hit per request.
// Real authorization always happens in server/authz.ts (session →
// membership → resource), never here.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/subscriptions",
  "/analytics",
  "/insights",
  "/settings",
];

const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !SESSION_COOKIES.some((c) => request.cookies.has(c))) {
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip static assets and Next internals.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
