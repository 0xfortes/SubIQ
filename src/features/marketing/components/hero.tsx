import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "./reveal";
import { RulerDemo } from "./ruler-demo";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pt-28 pb-24 sm:pt-36">
      {/* Ambient glows — decorative, GPU-only drift */}
      <div
        aria-hidden
        className="marketing-glow rounded-pill bg-accent/15 pointer-events-none absolute -top-48 left-1/2 size-[560px] -translate-x-[70%] blur-[130px]"
      />
      <div
        aria-hidden
        className="marketing-glow rounded-pill bg-mint/8 pointer-events-none absolute top-24 left-1/2 size-[420px] translate-x-[20%] blur-[120px] [animation-delay:-13s]"
      />

      <div className="max-w-content relative mx-auto flex flex-col items-center text-center">
        <h1 className="marketing-rise text-text max-w-3xl text-[40px] leading-[1.04] font-medium tracking-[-0.025em] sm:text-[64px]">
          Every subscription you pay for, in{" "}
          <em className="text-accent font-normal italic">one place</em>.
        </h1>

        <p className="marketing-rise text-muted mt-6 max-w-xl text-[15px] leading-relaxed [animation-delay:180ms] sm:text-base">
          Add what you&apos;re subscribed to. SubIQ tracks every renewal and
          adds up what you spend each month.
        </p>

        <div className="marketing-rise mt-9 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 [animation-delay:270ms]">
          <Button asChild size="lg" className="px-5">
            <Link href="/register">Start free</Link>
          </Button>
          <Link
            href="#product"
            className="group text-muted hover:text-text focus-visible:outline-accent inline-flex items-center gap-1 rounded-sm text-[14px] transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            See how it works
            <ArrowRight
              size={15}
              strokeWidth={1.75}
              className="transition-transform duration-150 ease-out group-hover:translate-x-0.5"
            />
          </Link>
        </div>
        {/* Sentinel: once it scrolls under the sticky header, the nav reveals its CTA. */}
        <div id="hero-cta-sentinel" aria-hidden className="h-px w-full" />

        <div className="marketing-rise mt-20 w-full max-w-4xl [animation-delay:420ms]">
          <Reveal>
            <RulerDemo />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
