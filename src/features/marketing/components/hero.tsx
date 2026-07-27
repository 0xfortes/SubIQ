import Link from "next/link";
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
        <span className="marketing-rise rounded-pill border-line bg-surface text-muted inline-flex items-center gap-1.5 border px-3 py-1 text-[11px] tracking-wide">
          <span className="rounded-pill bg-mint size-1.5" aria-hidden />
          Subscription intelligence
        </span>

        <h1 className="marketing-rise text-text mt-6 max-w-3xl text-[40px] leading-[1.04] font-medium tracking-[-0.025em] [animation-delay:90ms] sm:text-[64px]">
          Know where your money{" "}
          <em className="text-accent font-normal italic">quietly</em> goes.
        </h1>

        <p className="marketing-rise text-muted mt-6 max-w-xl text-[15px] leading-relaxed [animation-delay:180ms] sm:text-base">
          SubIQ tracks every subscription, forecasts every renewal, and surfaces
          the savings you didn&apos;t know existed — in one calm dashboard.
        </p>

        <div className="marketing-rise mt-9 flex flex-wrap items-center justify-center gap-3 [animation-delay:270ms]">
          <Button asChild size="lg" className="px-5">
            <Link href="#get-started">Start free</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="px-5">
            <Link href="#product">See how it works</Link>
          </Button>
        </div>

        <div className="marketing-rise mt-20 w-full max-w-4xl [animation-delay:420ms]">
          <Reveal>
            <RulerDemo />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
