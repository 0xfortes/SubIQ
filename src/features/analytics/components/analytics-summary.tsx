import { CalendarRange, TrendingUp, Wallet } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { formatMoney } from "@/lib/money";
import type { AnalyticsData } from "../queries";

/** Three derived figures the dashboard doesn't show: annual run-rate,
 * projected 12-month charges, and the priciest upcoming month. */
export function AnalyticsSummary({ data }: { data: AnalyticsData }) {
  const {
    currency,
    includedCount,
    foreignCount,
    annualRunRateMinor,
    projection,
    projectedTotalMinor,
    peakMonth,
  } = data;
  const hasMoney = includedCount > 0;
  const range =
    projection.length > 0
      ? `${projection[0]!.longLabel} – ${projection[projection.length - 1]!.longLabel}`
      : "";

  const excludedSuffix =
    foreignCount > 0 ? ` · ${foreignCount} in other currencies excluded` : "";

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard
        icon={Wallet}
        label="Annual run-rate"
        figure={hasMoney ? formatMoney(annualRunRateMinor, currency) : "—"}
        subline={
          hasMoney
            ? `monthly spend × 12, across ${includedCount} subscription${includedCount === 1 ? "" : "s"}${excludedSuffix}`
            : foreignCount > 0
              ? `all ${foreignCount} subscriptions are in other currencies`
              : "nothing tracked yet"
        }
      />
      <StatCard
        icon={CalendarRange}
        label="Next 12 months"
        figure={hasMoney ? formatMoney(projectedTotalMinor, currency) : "—"}
        subline={hasMoney ? `actual charges, ${range}` : "no upcoming charges"}
      />
      <StatCard
        icon={TrendingUp}
        tone="amber"
        label="Priciest month"
        figure={peakMonth ? formatMoney(peakMonth.totalMinor, currency) : "—"}
        subline={
          peakMonth
            ? `${peakMonth.longLabel} · ${peakMonth.count} charge${peakMonth.count === 1 ? "" : "s"}`
            : "no upcoming charges"
        }
      />
    </div>
  );
}
