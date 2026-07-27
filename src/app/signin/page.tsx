import { redirect } from "next/navigation";
import { auth, oauthProviderIds } from "@/lib/auth";
import { SignInForm, signInWithProvider } from "@/features/auth";
import { Button } from "@/components/ui/button";

const PROVIDER_LABELS: Record<string, string> = {
  google: "Continue with Google",
  github: "Continue with GitHub",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { callbackUrl } = await searchParams;
  // Only allow same-origin relative redirect targets.
  const safeCallbackUrl = callbackUrl?.startsWith("/")
    ? callbackUrl
    : undefined;

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="rounded-card border-line bg-surface w-full max-w-sm border p-6">
        <h1 className="text-base font-medium tracking-tight">
          Sign in to SubIQ
        </h1>
        <p className="text-muted mt-1 mb-5 text-xs">
          We&apos;ll email you a link — no password needed.
        </p>
        <SignInForm callbackUrl={safeCallbackUrl} />
        {oauthProviderIds.length > 0 ? (
          <>
            <div className="my-4 flex items-center gap-3">
              <div className="bg-line h-px flex-1" />
              <span className="text-faint text-[10px] tracking-wide uppercase">
                or
              </span>
              <div className="bg-line h-px flex-1" />
            </div>
            <div className="flex flex-col gap-2">
              {oauthProviderIds.map((provider) => (
                <form key={provider} action={signInWithProvider}>
                  <input type="hidden" name="provider" value={provider} />
                  <Button type="submit" variant="outline" className="w-full">
                    {PROVIDER_LABELS[provider] ?? `Continue with ${provider}`}
                  </Button>
                </form>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
