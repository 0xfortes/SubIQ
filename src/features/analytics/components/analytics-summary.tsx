import { CalendarRange, TrendingUp, Wallet } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { formatMoney } from "@/lib/money";
import type { AnalyticsData } from "../queries";

/** Three derived figures the dashboard doesn't show: annual run-rate,
 * projected 12-month charges, and the priciest upcoming month. */
export function AnalyticsSummary({ data }: { data: AnalyticsData }) {
  const {
    currency,
    billingCount,
    annualRunRateMinor,
    projection,
    projectedTotalMinor,
    peakMonth,
  } = data;
  const hasMoney = billingCount > 0;
  const range =
    projection.length > 0
      ? `${projection[0]!.longLabel} – ${projection[projection.length - 1]!.longLabel}`
      : "";

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard
        icon={Wallet}
        label="Annual run-rate"
        figure={hasMoney ? formatMoney(annualRunRateMinor, currency) : "—"}
        subline={
          hasMoney
            ? `monthly spend × 12, across ${billingCount} subscription${billingCount === 1 ? "" : "s"}`
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
