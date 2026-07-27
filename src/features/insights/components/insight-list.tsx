import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { recoverableTotalMinor } from "../rules";
import { InsightRow, type InsightItem } from "./insight-row";

/**
 * Full-page insight list for /insights — same visual language as the
 * dashboard panel, with room for discovery dates.
 */
export function InsightList({
  insights,
  currency,
  timeZone = "UTC",
}: {
  insights: (InsightItem & { createdAt: Date })[];
  currency: string;
  timeZone?: string;
}) {
  const recoverable = recoverableTotalMinor(insights, currency);

  return (
    <section
      aria-label="Insights"
      className="rounded-card border-line bg-surface border p-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-1.5 text-sm font-medium tracking-tight">
            <Sparkles size={13} aria-hidden className="text-accent" />
            Insights
          </h1>
          <p className="text-muted mt-1 text-xs">
            {insights.length === 0
              ? "Nothing needs your attention."
              : `${insights.length} ${insights.length === 1 ? "finding" : "findings"} from your current subscriptions.`}
          </p>
        </div>
        {recoverable > 0 ? (
          <span className="font-data rounded-pill bg-mint-soft text-mint px-2 py-0.5 text-[10.5px]">
            {formatMoney(recoverable, currency)} recoverable
          </span>
        ) : null}
      </header>

      {insights.length === 0 ? (
        <div className="flex flex-col items-center py-14 text-center">
          <p className="text-muted text-xs">
            All caught up. New insights arrive after your next sync.
          </p>
          <Link
            href="/subscriptions"
            className="text-accent focus-visible:outline-accent mt-3 inline-flex items-center gap-1 rounded-sm text-xs hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Review your subscriptions
            <ArrowRight size={11} aria-hidden />
          </Link>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-1.5">
          {insights.map((insight) => (
            <InsightRow
              key={insight.id}
              insight={insight}
              foundAt={insight.createdAt}
              timeZone={timeZone}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
