"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { err, type ActionResult } from "@/lib/errors";
import { rateLimit } from "@/server/rate-limit";
import { magicLinkSchema } from "./schemas";

const MAGIC_LINK_LIMIT = { limit: 3, windowMs: 15 * 60_000 };

export async function requestMagicLink(
  _previous: ActionResult<never> | null,
  formData: FormData,
): Promise<ActionResult<never>> {
  const parsed = magicLinkSchema.safeParse({
    email: formData.get("email"),
    callbackUrl: formData.get("callbackUrl") || undefined,
  });
  if (!parsed.success) {
    return err("Enter a valid email address");
  }

  const email = parsed.data.email.toLowerCase();
  const limited = rateLimit(`magic-link:${email}`, MAGIC_LINK_LIMIT);
  if (!limited.ok) {
    return err("Too many sign-in emails requested. Try again in 15 minutes.");
  }

  try {
    // redirect: false — we own the post-submit destination; redirectTo only
    // seeds the magic link's callback so the emailed link still lands on it.
    await signIn("email", {
      email,
      redirect: false,
      redirectTo: parsed.data.callbackUrl ?? "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return err("Couldn't send the sign-in email. Try again.");
    }
    throw error;
  }
  redirect("/check-email"); // Outside try — NEXT_REDIRECT must propagate.
}

export async function signInWithProvider(formData: FormData) {
  const provider = formData.get("provider");
  if (typeof provider !== "string" || provider === "email") return;
  await signIn(provider, { redirectTo: "/dashboard" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/signin" });
}
