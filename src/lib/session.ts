import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Mint a database session for a user and set the Auth.js session cookie.
 *
 * We keep Auth.js's `session.strategy: "database"` (see lib/auth.ts), so a
 * session is an opaque random token stored in the `Session` table with the raw
 * token as the cookie value — exactly what `PrismaAdapter.createSession` and
 * `tests/e2e/global-setup.ts` do. `auth()` reads it via the adapter and
 * `signOut()` deletes the row + clears the cookie. This is the one place
 * password login bypasses Auth.js's provider flow; everything downstream stays
 * unchanged, and OAuth/magic-link can be re-added later with no session change.
 */
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// Match Auth.js's cookie naming: the `__Secure-` prefix (which requires the
// Secure attribute) is used only over HTTPS in production. proxy.ts checks both.
const useSecureCookie = env.NODE_ENV === "production";
const SESSION_COOKIE_NAME = useSecureCookie
  ? "__Secure-authjs.session-token"
  : "authjs.session-token";

export async function createUserSession(userId: string): Promise<void> {
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + SESSION_MAX_AGE_MS);

  await db.session.create({ data: { sessionToken, userId, expires } });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureCookie,
    path: "/",
    expires,
  });
}

/**
 * Delete expired session rows. Auth.js already ignores expired sessions at
 * read time, so this is housekeeping only — run from the nightly job to stop
 * dead rows accumulating. Returns the number removed.
 */
export async function pruneExpiredSessions(now = new Date()): Promise<number> {
  const { count } = await db.session.deleteMany({
    where: { expires: { lt: now } },
  });
  return count;
}
