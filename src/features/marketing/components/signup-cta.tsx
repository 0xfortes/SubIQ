"use client";

import { useActionState } from "react";
// Direct action import — the auth barrel exports client components; the
// action file alone is safe for client bundles.
import { requestMagicLink } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export function SignupCta() {
  const [result, action, pending] = useActionState(requestMagicLink, null);

  return (
    <section id="get-started" className="relative overflow-hidden px-4 py-28">
      <div
        aria-hidden
        className="marketing-glow rounded-pill bg-accent/15 pointer-events-none absolute -bottom-56 left-1/2 size-[520px] -translate-x-1/2 blur-[130px]"
      />
      <div className="max-w-content relative mx-auto flex flex-col items-center text-center">
        <h2 className="text-text max-w-2xl text-[32px] leading-[1.1] font-medium tracking-[-0.025em] sm:text-[44px]">
          Your subscriptions won&apos;t audit{" "}
          <em className="text-accent font-normal italic">themselves</em>.
        </h2>
        <p className="text-muted mt-4 max-w-md text-[14.5px]">
          Enter your email and we&apos;ll send a sign-in link. You&apos;ll see
          your first renewal forecast minutes from now.
        </p>

        <form
          action={action}
          className="mt-9 flex w-full max-w-md flex-col gap-2 sm:flex-row"
        >
          <label htmlFor="cta-email" className="sr-only">
            Email address
          </label>
          <input
            id="cta-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            aria-describedby={result && !result.ok ? "cta-error" : undefined}
            className="border-line bg-surface text-text placeholder:text-faint hover:border-line-strong focus-visible:outline-accent h-11 min-w-0 flex-1 rounded-md border px-3.5 text-[13.5px] transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2"
          />
          <Button type="submit" size="lg" disabled={pending} className="px-5">
            {pending ? "Sending link…" : "Start free"}
          </Button>
        </form>
        {result && !result.ok ? (
          <p id="cta-error" role="alert" className="text-rose mt-3 text-xs">
            {result.error}
          </p>
        ) : null}
        <p className="text-faint mt-4 text-[11.5px]">
          No password. No card. 30 seconds.
        </p>
      </div>
    </section>
  );
}
