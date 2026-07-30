"use server";

import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { err, type ActionResult } from "@/lib/errors";
import {
  dummyPasswordHash,
  hashPassword,
  verifyPassword,
} from "@/lib/password";
import { createUserSession } from "@/lib/session";
import { bootstrapPersonalWorkspace } from "@/lib/workspace";
import { rateLimit } from "@/server/rate-limit";
import { loginSchema, registerSchema } from "./schemas";

const REGISTER_LIMIT = { limit: 5, windowMs: 15 * 60_000 };
const LOGIN_LIMIT = { limit: 10, windowMs: 15 * 60_000 };
// Durable per-account lockout (survives serverless cold starts, unlike the
// in-memory limiter above): lock after this many consecutive failures.
const MAX_FAILED_LOGINS = 10;
const LOCKOUT_MS = 15 * 60_000;
// Same generic message for "no such user" and "wrong password" — never leak
// which emails have accounts.
const INVALID_CREDENTIALS = "Invalid email or password";
const THROTTLED = "Too many failed attempts. Try again in a few minutes.";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/** Atomically bump the failure count and lock the account once it crosses the
 * threshold (then reset the counter so the next window starts fresh). */
async function recordFailedLogin(userId: string): Promise<void> {
  const { failedLoginCount } = await db.user.update({
    where: { id: userId },
    data: { failedLoginCount: { increment: 1 } },
    select: { failedLoginCount: true },
  });
  if (failedLoginCount >= MAX_FAILED_LOGINS) {
    await db.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: 0,
        lockedUntil: new Date(Date.now() + LOCKOUT_MS),
      },
    });
  }
}

export async function registerAction(
  input: unknown,
): Promise<ActionResult<never>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Check the form and retry");
  }
  const { name, email, password, callbackUrl } = parsed.data;

  const limited = rateLimit(`register:${email}`, REGISTER_LIMIT);
  if (!limited.ok) {
    return err("Too many attempts. Try again in a few minutes.");
  }

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    // NOTE: this reveals that an account exists (enumeration). The privacy-
    // preserving alternative (generic message + email the existing owner)
    // needs a verified sending domain, which SubIQ doesn't have yet — revisit
    // together with email verification.
    return err("An account with this email already exists.");
  }

  try {
    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash,
        // No verification step — there's no sending domain yet. Mark active.
        emailVerified: new Date(),
      },
      select: { id: true },
    });
    // events.createUser only fires on the adapter path (OAuth/magic-link), so
    // bootstrap the workspace explicitly here. It's idempotent.
    await bootstrapPersonalWorkspace(user.id);
    await createUserSession(user.id);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return err("An account with this email already exists.");
    }
    console.error("[auth] registration failed:", error);
    return err("Couldn't create your account. Try again.");
  }

  redirect(callbackUrl ?? "/dashboard"); // Outside try — NEXT_REDIRECT propagates.
}

export async function loginAction(
  input: unknown,
): Promise<ActionResult<never>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return err(INVALID_CREDENTIALS);
  }
  const { email, password, callbackUrl } = parsed.data;

  const limited = rateLimit(`login:${email}`, LOGIN_LIMIT);
  if (!limited.ok) return err(THROTTLED);

  try {
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true, lockedUntil: true },
    });

    const locked =
      user?.lockedUntil != null && user.lockedUntil.getTime() > Date.now();

    // Always run scrypt — against the real hash or a dummy — so response time
    // doesn't reveal whether the account exists (removes the timing oracle).
    const passwordOk = await verifyPassword(
      password,
      user?.passwordHash ?? (await dummyPasswordHash()),
    );

    if (locked) return err(THROTTLED);

    if (!user || !user.passwordHash || !passwordOk) {
      if (user) await recordFailedLogin(user.id);
      return err(INVALID_CREDENTIALS);
    }

    // Success — clear the throttle, then mint the session.
    await db.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
    await createUserSession(user.id);
  } catch (error) {
    console.error("[auth] login failed:", error);
    return err("Couldn't sign you in. Try again.");
  }

  redirect(callbackUrl ?? "/dashboard"); // Outside try — NEXT_REDIRECT propagates.
}

export async function signInWithProvider(formData: FormData) {
  const provider = formData.get("provider");
  if (typeof provider !== "string") return;
  await signIn(provider, { redirectTo: "/dashboard" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
