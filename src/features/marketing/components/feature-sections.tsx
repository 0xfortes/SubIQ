import { Reveal } from "./reveal";

/**
 * Three short value props beneath the product preview. The preview shows what
 * the app looks like; this copy names what each part is for.
 */
const SECTIONS = [
  {
    eyebrow: "Everything in one place",
    title: "Every subscription, grouped by category.",
    body: "Streaming, design tools, the gym, that AI plan you tried once. SubIQ keeps a running monthly total for each category, so the number you could never quite add up is on screen.",
  },
  {
    eyebrow: "See renewals coming",
    title: "Every renewal, on one timeline.",
    body: "SubIQ works out each upcoming charge and lays the next 30 days on a timeline. Anything due soon turns amber, and the email reminder reaches you a few days before the charge.",
  },
  {
    eyebrow: "Cut what you don't use",
    title: "Where you're paying too much.",
    body: "SubIQ spots two apps that do the same job, a trial about to start charging, and a monthly plan that costs less paid yearly. Each one shows the amount you'd save.",
  },
];

export function FeatureSections() {
  return (
    <div className="max-w-content mx-auto grid gap-10 px-4 py-24 sm:grid-cols-3 sm:gap-10">
      {SECTIONS.map((section, index) => (
        <Reveal key={section.title} delay={index * 90}>
          <p className="text-accent text-[11px] font-medium tracking-widest uppercase">
            {section.eyebrow}
          </p>
          <h3 className="text-text mt-3 text-[18px] leading-snug font-medium tracking-tight">
            {section.title}
          </h3>
          <p className="text-muted mt-2.5 text-[13.5px] leading-relaxed">
            {section.body}
          </p>
        </Reveal>
      ))}
    </div>
  );
}
