import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import type { RulerItem } from "@/lib/renewal-ruler";
import type { InsightItem } from "@/features/insights";
import type { DashboardKpis } from "../queries";
import { KpiRow } from "./kpi-row";
import { RenewalRuler } from "./renewal-ruler";
import { InsightsPanel } from "./insights-panel";

/**
 * The returning-user home rendered at `/` for authenticated visitors (the
 * logged-out `/` stays the marketing landing). A focused "glance + go" lobby:
 * a personalized greeting, one primary way back into the product, and the same
 * real dashboard widgets (KPIs, Renewal Ruler, Insights) — reused, never mocked,
 * so this can't drift from `/dashboard`. It deliberately omits the working
 * surfaces (trend chart, subscriptions table, category scope) that live there.
 */
export function HomeOverview({
  name,
  isEmpty,
  kpis,
  savingsMinor,
  insights,
  rulerItems,
  rulerTotalMinor,
  currency,
  timeZone,
}: {
  name: string | null;
  isEmpty: boolean;
  kpis: DashboardKpis;
  savingsMinor: number;
  insights: InsightItem[];
  rulerItems: RulerItem[];
  rulerTotalMinor: number;
  currency: string;
  timeZone: string;
}) {
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(new Date());

  const greeting = `${isEmpty ? "Welcome" : "Welcome back"}${name ? `, ${name}` : ""}.`;

  return (
    <section className="max-w-content mx-auto px-4 pt-16 pb-24 sm:pt-20">
      <header className="mb-8">
        <p className="text-faint text-[11px] font-medium tracking-[0.14em] uppercase">
          {today}
        </p>
        <h1 className="text-text mt-2 text-[28px] leading-tight font-medium tracking-[-0.02em] sm:text-[34px]">
          {greeting}
        </h1>
        <p className="text-muted mt-2 max-w-xl text-[14.5px] leading-relaxed">
          {summaryLine(isEmpty, kpis, currency)}
        </p>

        {!isEmpty ? (
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Button asChild size="lg" className="px-5">
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
            <Link
              href="/subscriptions"
              className="group text-muted hover:text-text focus-visible:outline-accent inline-flex items-center gap-1 rounded-sm text-[14px] transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Manage subscriptions
              <ArrowRight
                size={15}
                strokeWidth={1.75}
                className="transition-transform duration-150 ease-out group-hover:translate-x-0.5"
              />
            </Link>
            {insights.length > 0 ? (
              <Link
                href="/insights"
                className="text-muted hover:text-text focus-visible:outline-accent rounded-sm text-[14px] transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Review insights
              </Link>
            ) : null}
          </div>
        ) : null}
      </header>

      {isEmpty ? (
        <div className="rounded-card border-line bg-surface flex flex-col items-center border p-10 text-center">
          <span
            aria-hidden
            className="bg-accent-soft text-accent flex size-10 items-center justify-center rounded-[10px]"
          >
            <Plus size={18} strokeWidth={1.75} />
          </span>
          <p className="text-text mt-4 text-[15px] font-medium">
            You haven&apos;t added any subscriptions yet
          </p>
          <p className="text-muted mt-1.5 max-w-sm text-[13.5px]">
            Add your first and your monthly total and upcoming renewals show up
            here.
          </p>
          <Button asChild size="lg" className="mt-6 px-5">
            <Link href="/subscriptions?new=1">Add subscription</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <KpiRow
            kpis={kpis}
            savingsMinor={savingsMinor}
            savingsCount={insights.length}
          />
          <RenewalRuler
            items={rulerItems}
            totalMinor={rulerTotalMinor}
            currency={currency}
            timeZone={timeZone}
          />
          <InsightsPanel insights={insights} currency={currency} />
        </div>
      )}
    </section>
  );
}

/** Plain-voice, amounts-over-adjectives summary sentence (DESIGN.md Voice). */
function summaryLine(
  isEmpty: boolean,
  kpis: DashboardKpis,
  currency: string,
): string {
  if (isEmpty) {
    return "Let's add your first subscription to start tracking your renewals.";
  }
  if (kpis.billingCount === 0) {
    return "None of your subscriptions are billing right now.";
  }
  const plural = kpis.billingCount === 1 ? "" : "s";
  const spend = formatMoney(kpis.monthlySpendMinor, currency);
  let line = `You're tracking ${kpis.billingCount} subscription${plural}, ${spend} a month.`;
  if (kpis.renewingThisWeekCount > 0) {
    const verb = kpis.renewingThisWeekCount === 1 ? "renews" : "renew";
    line += ` ${kpis.renewingThisWeekCount} ${verb} this week.`;
  }
  return line;
}
