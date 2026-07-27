import { Sparkles } from "lucide-react";
import {
  InsightRow,
  recoverableTotalMinor,
  type InsightItem,
} from "@/features/insights";
import { formatMoney } from "@/lib/money";

export type { InsightItem };

export function InsightsPanel({
  insights,
  currency,
}: {
  insights: InsightItem[];
  currency: string;
}) {
  const recoverable = recoverableTotalMinor(insights, currency);

  return (
    <section
      aria-label="Insights"
      className="rounded-card border-line bg-surface flex flex-col border p-4"
    >
      <header className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-medium tracking-tight">
          <Sparkles size={13} aria-hidden className="text-accent" />
          Insights
        </h2>
        {recoverable > 0 ? (
          <span className="font-data rounded-pill bg-mint-soft text-mint px-2 py-0.5 text-[10.5px]">
            {formatMoney(recoverable, currency)} recoverable
          </span>
        ) : null}
      </header>

      {insights.length === 0 ? (
        <p className="text-muted my-auto py-8 text-center text-xs">
          All caught up. New insights arrive after your next sync.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1">
          {insights.map((insight) => (
            <InsightRow key={insight.id} insight={insight} />
          ))}
        </ul>
      )}
    </section>
  );
}
