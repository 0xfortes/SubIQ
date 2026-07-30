import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth";
import { OAuthButtons } from "@/features/auth/components/oauth-buttons";
import { auth } from "@/lib/auth";
import { isSafeInternalPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
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
      <h1 className="text-base font-medium tracking-tight">Log in to SubIQ</h1>
      <p className="text-muted mt-1 mb-5 text-xs">
        Welcome back. Enter your details to continue.
      </p>
      <LoginForm callbackUrl={safeCallbackUrl} />
      <OAuthButtons />
      <p className="text-muted mt-5 text-center text-xs">
        Need an account?{" "}
        <Link
          href="/register"
          className="text-accent focus-visible:outline-accent rounded-sm hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
