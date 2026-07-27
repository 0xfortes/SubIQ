import { CalendarClock, Copy, PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

/**
 * Three scroll-revealed product narratives, each with a live mock visual
 * built from the real design system (tokens, mono figures, pills) — no
 * screenshots. Visuals are decorative; the copy carries the story.
 */

const CATEGORY_ROWS = [
  { name: "Design", color: "#8B93FF", total: "$75" },
  { name: "AI Tools", color: "#C9A0F5", total: "$50" },
  { name: "Entertainment", color: "#F0708A", total: "$35" },
  { name: "Dev & Infra", color: "#6FA8F5", total: "$28" },
];

function SeeEverythingVisual() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <div className="rounded-card border-line bg-surface border p-4">
        <p className="text-muted text-xs">Monthly spend</p>
        <p className="font-data text-text mt-2 text-[26px] leading-none font-medium tracking-tight">
          $233.12
        </p>
        <p className="text-faint mt-1.5 text-[11.5px]">
          across 14 subscriptions
        </p>
      </div>
      <div className="rounded-card border-line bg-surface border p-2">
        {CATEGORY_ROWS.map((row) => (
          <div
            key={row.name}
            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs"
          >
            <span
              className="size-[7px] rounded-[2px]"
              style={{ backgroundColor: row.color }}
            />
            <span className="text-muted flex-1">{row.name}</span>
            <span className="font-data text-faint text-[11px]">
              {row.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NeverSurprisedVisual() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <div className="rounded-card border-amber/40 bg-amber-soft border p-4">
        <div className="flex items-center gap-2">
          <span className="bg-amber-soft text-amber flex size-6 items-center justify-center rounded-[7px]">
            <CalendarClock size={13} strokeWidth={1.75} />
          </span>
          <p className="text-amber text-xs font-medium">Renewing tomorrow</p>
        </div>
        <p className="text-text mt-2.5 text-[13px]">
          Netflix — <span className="font-data">$15.49</span> leaves your
          account Jul 25.
        </p>
      </div>
      <div className="rounded-card border-line bg-surface border p-4">
        <p className="text-faint text-[10px] tracking-widest uppercase">
          Email reminder
        </p>
        <p className="text-text mt-2 text-[13px]">
          Adobe renews in 3 days — <span className="font-data">$59.99</span>.
        </p>
        <p className="text-muted mt-1 text-xs">
          Still using it? Cancel or keep — your call, made in time.
        </p>
      </div>
    </div>
  );
}

const INSIGHTS = [
  {
    icon: Copy,
    chip: "bg-rose-soft text-rose",
    title: "Two music services",
    body: "Spotify and Apple Music overlap. Dropping one saves $10.99/mo.",
  },
  {
    icon: CalendarClock,
    chip: "bg-amber-soft text-amber",
    title: "Trial ends Jul 30",
    body: "Midjourney converts to $10.00/mo in 6 days.",
  },
  {
    icon: PiggyBank,
    chip: "bg-mint-soft text-mint",
    title: "Switch Figma to annual",
    body: "Paying yearly saves $36.00 every year.",
  },
];

function StopWasteVisual() {
  return (
    <div aria-hidden className="rounded-card border-line bg-surface border p-4">
      <div className="flex items-center justify-between">
        <p className="text-text text-[13px] font-medium tracking-tight">
          Insights
        </p>
        <span className="font-data rounded-pill bg-mint-soft text-mint px-2 py-0.5 text-[10.5px]">
          $178.88 recoverable
        </span>
      </div>
      <div className="mt-3 flex flex-col gap-1">
        {INSIGHTS.map((insight) => (
          <div key={insight.title} className="flex gap-2.5 rounded-md p-2">
            <span
              className={cn(
                "flex size-[26px] shrink-0 items-center justify-center rounded-[7px]",
                insight.chip,
              )}
            >
              <insight.icon size={13} strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-text text-[12.5px] font-medium">
                {insight.title}
              </p>
              <p className="text-muted mt-0.5 text-xs">{insight.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const SECTIONS = [
  {
    id: "product",
    eyebrow: "See everything",
    title: "Every subscription, one calm view.",
    body: "Streaming, tools, infrastructure, memberships — organized by category with live monthly totals. The number you could never quite add up in your head, finally on screen.",
    visual: <SeeEverythingVisual />,
  },
  {
    eyebrow: "Never get surprised",
    title: "Every renewal, on one ruler.",
    body: "SubIQ computes each upcoming charge and lays the next 30 days on a timeline. Imminent renewals turn amber, and email reminders land before the money leaves — not after.",
    visual: <NeverSurprisedVisual />,
  },
  {
    eyebrow: "Stop the waste",
    title: "Insights that pay for themselves.",
    body: "Duplicate services, trials about to convert, monthly plans that should be annual — SubIQ finds them and shows exactly what acting on each one recovers.",
    visual: <StopWasteVisual />,
  },
];

export function FeatureSections() {
  return (
    <div className="max-w-content mx-auto flex flex-col gap-28 px-4 py-24">
      {SECTIONS.map((section, index) => (
        <section
          key={section.title}
          id={section.id}
          className="grid items-center gap-10 min-[900px]:grid-cols-2 min-[900px]:gap-16"
        >
          <Reveal className={cn(index % 2 === 1 && "min-[900px]:order-2")}>
            <p className="text-accent text-[11px] font-medium tracking-widest uppercase">
              {section.eyebrow}
            </p>
            <h2 className="text-text mt-3 max-w-md text-[28px] leading-[1.15] font-medium tracking-[-0.02em] sm:text-[34px]">
              {section.title}
            </h2>
            <p className="text-muted mt-4 max-w-md text-[14.5px] leading-relaxed">
              {section.body}
            </p>
          </Reveal>
          <Reveal
            delay={120}
            className={cn(
              "mx-auto w-full max-w-sm",
              index % 2 === 1 && "min-[900px]:order-1",
            )}
          >
            {section.visual}
          </Reveal>
        </section>
      ))}
    </div>
  );
}
