import { CalendarClock, Layers, Sparkles, Wallet } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { formatMoney } from "@/lib/money";
import type { DashboardKpis } from "../queries";

export function KpiRow({
  kpis,
  savingsMinor,
  savingsCount,
}: {
  kpis: DashboardKpis;
  savingsMinor: number;
  savingsCount: number;
}) {
  const { currency } = kpis;
  const hasSpend = kpis.billingCount > 0;

  return (
    <div className="grid grid-cols-2 gap-3 min-[1020px]:grid-cols-4">
      <StatCard
        icon={Wallet}
        label={kpis.scopeLabel ? `${kpis.scopeLabel} spend` : "Monthly spend"}
        figure={hasSpend ? formatMoney(kpis.monthlySpendMinor, currency) : "—"}
        subline={
          !hasSpend
            ? "nothing tracked yet"
            : `across ${kpis.billingCount} subscription${kpis.billingCount === 1 ? "" : "s"}`
        }
      />
      <StatCard
        icon={Layers}
        label="Active subscriptions"
        figure={String(kpis.activeCount)}
        subline={
          kpis.trialCount > 0
            ? `+${kpis.trialCount} in trial`
            : "no trials running"
        }
      />
      <StatCard
        icon={CalendarClock}
        tone="amber"
        label="Renewing this week"
        figure={
          kpis.renewingThisWeekCount > 0
            ? formatMoney(kpis.renewingThisWeekMinor, currency)
            : "—"
        }
        subline={
          kpis.renewingThisWeekCount > 0
            ? `${kpis.renewingThisWeekCount} renewal${kpis.renewingThisWeekCount === 1 ? "" : "s"} in the next 7 days`
            : "nothing due"
        }
      />
      <StatCard
        icon={Sparkles}
        tone="mint"
        label="Potential savings"
        figure={savingsMinor > 0 ? formatMoney(savingsMinor, currency) : "—"}
        subline={
          savingsCount > 0
            ? `from ${savingsCount} insight${savingsCount === 1 ? "" : "s"}`
            : "nothing found yet"
        }
      />
    </div>
  );
}
