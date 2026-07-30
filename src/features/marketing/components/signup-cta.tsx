import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignupCta() {
  return (
    <section id="get-started" className="relative overflow-hidden px-4 py-28">
      <div
        aria-hidden
        className="marketing-glow rounded-pill bg-accent/15 pointer-events-none absolute -bottom-56 left-1/2 size-[520px] -translate-x-1/2 blur-[130px]"
      />
      <div className="max-w-content relative mx-auto flex flex-col items-center text-center">
        <h2 className="text-text max-w-2xl text-[32px] leading-[1.1] font-medium tracking-[-0.025em] sm:text-[44px]">
          See your first renewals in{" "}
          <em className="text-accent font-normal italic">a few minutes</em>.
        </h2>
        <p className="text-muted mt-4 max-w-md text-[14.5px]">
          Create your account, add your subscriptions, and your monthly total
          shows up right away.
        </p>
        <Button asChild size="lg" className="mt-9">
          <Link href="/register">
            Create your account
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  );
}
