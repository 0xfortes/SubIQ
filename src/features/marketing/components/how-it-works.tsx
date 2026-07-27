import { Reveal } from "./reveal";

const STEPS = [
  {
    number: "01",
    title: "Add your subscriptions",
    body: "Name, price, billing cycle. Ten of them takes about three minutes.",
  },
  {
    number: "02",
    title: "See what's coming",
    body: "Renewal dates are computed automatically and laid out on your 30-day ruler.",
  },
  {
    number: "03",
    title: "Act on insights",
    body: "Cancel the duplicate, catch the trial, switch to annual — before the next charge.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-line bg-surface/40 border-y">
      <div className="max-w-content mx-auto px-4 py-24">
        <Reveal className="text-center">
          <p className="text-accent text-[11px] font-medium tracking-widest uppercase">
            How it works
          </p>
          <h2 className="text-text mt-3 text-[28px] font-medium tracking-[-0.02em] sm:text-[34px]">
            Set up in 30 seconds.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step, index) => (
            <Reveal key={step.number} delay={index * 110}>
              <p className="font-data text-accent text-[13px]">{step.number}</p>
              <div className="marketing-line bg-line-strong mt-3 h-px w-10 sm:w-14" />
              <h3 className="text-text mt-4 text-[15px] font-medium tracking-tight">
                {step.title}
              </h3>
              <p className="text-muted mt-2 max-w-xs text-[13px] leading-relaxed">
                {step.body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
