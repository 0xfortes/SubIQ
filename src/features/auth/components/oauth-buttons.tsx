import { Button } from "@/components/ui/button";
import { oauthProviderIds } from "@/lib/auth";
import { signInWithProvider } from "../actions";

const PROVIDER_LABELS: Record<string, string> = {
  google: "Continue with Google",
  github: "Continue with GitHub",
};

/** Divider + one OAuth button per configured provider. Renders nothing when
 * no OAuth providers are configured (the common case pre-launch). */
export function OAuthButtons() {
  if (oauthProviderIds.length === 0) return null;
  return (
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
  );
}
