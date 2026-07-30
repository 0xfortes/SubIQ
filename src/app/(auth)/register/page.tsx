import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/features/auth";
import { OAuthButtons } from "@/features/auth/components/oauth-buttons";
import { auth } from "@/lib/auth";
import { isSafeInternalPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Create your account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { callbackUrl } = await searchParams;
  // Only allow same-origin relative redirect targets (no `//host` open redirect).
  const safeCallbackUrl =
    callbackUrl && isSafeInternalPath(callbackUrl) ? callbackUrl : undefined;

  return (
    <div className="rounded-card border-line bg-surface w-full max-w-sm border p-6">
      <h1 className="text-base font-medium tracking-tight">
        Create your account
      </h1>
      <p className="text-muted mt-1 mb-5 text-xs">
        Start tracking your subscriptions in under a minute.
      </p>
      <RegisterForm callbackUrl={safeCallbackUrl} />
      <OAuthButtons />
      <p className="text-muted mt-5 text-center text-xs">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-accent focus-visible:outline-accent rounded-sm hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
