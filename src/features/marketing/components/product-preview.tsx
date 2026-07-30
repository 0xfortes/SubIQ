import { ArrowUpRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryMark } from "@/components/ui/category-mark";
import { ServiceAvatar } from "@/components/ui/service-avatar";
import { Reveal } from "./reveal";

/**
 * Flagship product preview — a single framed "app" surface with an editorial,
 * asymmetric interior (not a grid of KPI cards). Fully static mock data built
 * from the design tokens; decorative, so the frame is aria-hidden and the
 * surrounding copy carries the meaning. Category mark colors are the one
 * sanctioned raw-hex exception (they mirror the DB category palette).
 */

const CATEGORIES = [
  { name: "Design", color: "#8B93FF", amount: "$74.99", pct: 28 },
  { name: "Dev & Infra", color: "#6FA8F5", amount: "$56.40", pct: 21 },
  { name: "AI Tools", color: "#C9A0F5", amount: "$50.00", pct: 19 },
  { name: "Entertainment", color: "#F0708A", amount: "$41.47", pct: 16 },
  { name: "Health", color: "#F2B25C", amount: "$30.00", pct: 11 },
  { name: "Productivity", color: "#4FD1A1", amount: "$10.99", pct: 5 },
];

const UPCOMING = [
  {
    name: "Netflix",
    color: "#F0708A",
    when: "in 2 days",
    date: "Jul 25",
    amount: "$15.49",
  },
  {
    name: "Adobe CC",
    color: "#8B93FF",
    when: "in 5 days",
    date: "Jul 28",
    amount: "$59.99",
  },
  {
    name: "ChatGPT",
    color: "#C9A0F5",
    when: "in 9 days",
    date: "Aug 1",
    amount: "$20.00",
  },
];

const CHANGES = [
  {
    dot: "bg-mint",
    text: "Cancelled Notion Plus",
    meta: "saves $8.00 a month",
  },
  {
    dot: "bg-mint",
    text: "Figma moved to yearly",
    meta: "saves $36.00 a year",
  },
  { dot: "bg-amber", text: "Midjourney trial started", meta: "charges Aug 3" },
];

/** Six-month spend, as a compact area sparkline (accent stroke + fade fill). */
function SpendTrend() {
  const line = "M0,56 L60,39.7 L120,44.5 L180,23.4 L240,29.1 L300,8";
  return (
    <div className="mt-8">
      <div className="flex items-baseline justify-between">
        <p className="text-text text-[12.5px] font-medium">Monthly trend</p>
        <p className="text-faint text-[11px]">last 6 months</p>
      </div>
      <svg
        viewBox="0 0 300 64"
        preserveAspectRatio="none"
        className="text-accent mt-3 h-14 w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="spend-trend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line} L300,64 L0,64 Z`} fill="url(#spend-trend)" />
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1.5 flex justify-between">
        <span className="font-data text-faint text-[10px]">Feb</span>
        <span className="font-data text-faint text-[10px]">Jul</span>
      </div>
    </div>
  );
}

export function ProductPreview() {
  return (
    <section id="product" className="relative overflow-hidden px-4 py-24">
      <div
        aria-hidden
        className="marketing-glow rounded-pill bg-accent/10 pointer-events-none absolute top-40 left-1/2 size-[640px] -translate-x-1/2 blur-[150px]"
      />

      <div className="max-w-content relative mx-auto">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="text-accent text-[11px] font-medium tracking-widest uppercase">
            Once you&apos;re in
          </p>
          <h2 className="text-text mt-3 text-[28px] leading-[1.15] font-medium tracking-[-0.02em] sm:text-[34px]">
            The whole month on one screen.
          </h2>
          <p className="text-muted mt-4 text-[14.5px] leading-relaxed">
            Spending, renewals, and what changed, without opening a spreadsheet.
          </p>
        </Reveal>

        <Reveal delay={120} className="mt-12">
          <div
            aria-hidden
            className="rounded-card border-line-strong bg-surface overflow-hidden border shadow-[0_40px_120px_-50px_rgba(0,0,0,0.9)]"
          >
            {/* Titlebar */}
            <div className="border-line flex h-11 items-center justify-between gap-3 border-b px-4">
              <div className="flex items-center gap-2.5">
                <div className="bg-accent text-on-accent flex size-5 items-center justify-center rounded-[6px] text-[9px] font-semibold">
                  S
                </div>
                <span className="text-text text-[12px] font-medium">
                  Dashboard
                </span>
                <span className="text-faint text-[11px]">This month</span>
              </div>
              <span className="border-line text-muted inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]">
                <Plus size={12} strokeWidth={2} />
                Add
              </span>
            </div>

            {/* Body */}
            <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[1.5fr_1fr] lg:gap-10">
              {/* Left: spend + distribution */}
              <div className="flex flex-col">
                <p className="text-faint text-[10.5px] tracking-widest uppercase">
                  This month
                </p>
                <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                  <span className="font-data text-text text-[46px] leading-none font-medium tracking-tight sm:text-[54px]">
                    $263.85
                  </span>
                  <span className="text-faint mb-1 inline-flex items-center gap-0.5 text-[12px]">
                    <ArrowUpRight size={13} strokeWidth={1.75} />
                    <span className="font-data">$21</span> vs June
                  </span>
                </div>
                <p className="text-muted mt-2.5 text-[12.5px]">
                  <span className="font-data text-text">16</span> active
                  subscriptions · <span className="font-data text-text">3</span>{" "}
                  renew this week
                </p>

                <div className="mt-8">
                  <div className="flex items-baseline justify-between">
                    <p className="text-text text-[12.5px] font-medium">
                      Where it goes
                    </p>
                    <p className="text-faint text-[11px]">6 categories</p>
                  </div>
                  <div className="mt-3 flex h-2.5 gap-[2px] overflow-hidden rounded-[3px]">
                    {CATEGORIES.map((c) => (
                      <div
                        key={c.name}
                        style={{ width: `${c.pct}%`, backgroundColor: c.color }}
                      />
                    ))}
                  </div>
                  <div className="mt-4 grid gap-x-8 gap-y-0.5 sm:grid-cols-2">
                    {CATEGORIES.map((c) => (
                      <div
                        key={c.name}
                        className="group hover:bg-wash flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors duration-100"
                      >
                        <CategoryMark color={c.color} />
                        <span className="text-muted group-hover:text-text flex-1 text-[12px] transition-colors duration-100">
                          {c.name}
                        </span>
                        <span className="font-data text-text text-[12px]">
                          {c.amount}
                        </span>
                        <span className="font-data text-faint w-8 text-right text-[11px]">
                          {c.pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <SpendTrend />
              </div>

              {/* Right: coming up + changes + stats */}
              <div className="border-line flex flex-col gap-6 lg:border-l lg:pl-10">
                <div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-text text-[12.5px] font-medium">
                      Coming up
                    </p>
                    <span className="font-data rounded-pill bg-amber-soft text-amber px-2 py-0.5 text-[10.5px]">
                      3 this week
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-col">
                    {UPCOMING.map((u) => (
                      <div
                        key={u.name}
                        className="group hover:bg-wash flex items-center gap-3 rounded-md px-1.5 py-2 transition-colors duration-100"
                      >
                        <ServiceAvatar
                          name={u.name}
                          color={u.color}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-text truncate text-[12.5px]">
                            {u.name}
                          </p>
                          <p className="text-faint text-[11px]">
                            {u.when} ·{" "}
                            <span className="font-data">{u.date}</span>
                          </p>
                        </div>
                        <span className="font-data text-text text-[12.5px]">
                          {u.amount}
                        </span>
                      </div>
                    ))}
                    <p className="text-faint mt-1 pl-1.5 text-[11px]">
                      +5 more this month
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-text text-[12.5px] font-medium">
                    Recent changes
                  </p>
                  <div className="border-line mt-3 flex flex-col gap-3 border-l pl-4">
                    {CHANGES.map((ch) => (
                      <div key={ch.text} className="relative">
                        <span
                          className={cn(
                            "rounded-pill absolute top-1 -left-[18.5px] size-1.5",
                            ch.dot,
                          )}
                        />
                        <p className="text-text text-[12px]">{ch.text}</p>
                        <p className="text-faint text-[11px]">{ch.meta}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-line mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4 text-[11.5px]">
                  <span className="text-muted inline-flex items-center gap-1.5">
                    <span className="bg-mint rounded-pill size-1.5" />
                    <span className="font-data text-text">16</span> active
                  </span>
                  <span className="text-muted inline-flex items-center gap-1.5">
                    <span className="bg-faint rounded-pill size-1.5" />
                    <span className="font-data text-text">2</span> paused
                  </span>
                  <span className="text-line-strong">·</span>
                  <span className="text-muted">
                    <span className="font-data text-text">12</span> monthly,{" "}
                    <span className="font-data text-text">4</span> yearly
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
