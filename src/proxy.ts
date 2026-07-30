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

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy, built per request so production can use a fresh
 * per-response nonce + `strict-dynamic` instead of `'unsafe-inline'` scripts.
 * Next.js reads the nonce from this header (set on the request below) and
 * stamps it onto its own <script> tags. Dev stays loose so React Fast Refresh
 * (inline + eval) keeps working.
 */
function buildCsp(nonce: string): string {
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;
  return [
    "default-src 'self'",
    scriptSrc,
    // Next inlines critical CSS; nonces don't reach those, so keep unsafe-inline.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    // Sentry error ingest (browser SDK). Harmless when the DSN is unset.
    "connect-src 'self' https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !SESSION_COOKIES.some((c) => request.cookies.has(c))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  // Set on the request so Next applies the nonce to its scripts, and on the
  // response so the browser enforces it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Skip static assets and Next internals.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
