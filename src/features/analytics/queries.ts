import { fetchWorkspaceSubs } from "@/features/dashboard";
import { todayInZone } from "@/lib/dates";
import { monthlyEquivalentInBaseMinor } from "@/lib/money";
import { BILLING_STATUSES } from "@/lib/subscription-status";
import {
  categoryBreakdown,
  costLeaderboard,
  projectionByMonth,
  type CategorySlice,
  type LeaderboardRow,
  type ProjectionMonth,
} from "./lib";

export interface AnalyticsData {
  currency: string;
  /** All billing subs; money figures cover every currency (converted). */
  billingCount: number;
  monthlyTotalMinor: number;
  annualRunRateMinor: number;
  projection: ProjectionMonth[];
  projectedTotalMinor: number;
  peakMonth: ProjectionMonth | null;
  slices: CategorySlice[];
  leaderboard: LeaderboardRow[];
}

/** All analytics widgets from the shared request-cached subscription fetch —
 * zero extra DB queries beyond what the app layout already runs. */
export async function getAnalyticsData(
  workspaceId: string,
  timeZone: string,
): Promise<AnalyticsData> {
  const [workspace, subs] = await fetchWorkspaceSubs(workspaceId);
  const currency = workspace.defaultCurrency;
  const todayStart = todayInZone(timeZone);

  const billing = subs.filter((sub) => BILLING_STATUSES.has(sub.status));
  const monthlyTotalMinor = billing.reduce(
    (sum, sub) => sum + monthlyEquivalentInBaseMinor(sub, currency),
    0,
  );

  const projection = projectionByMonth(subs, currency, todayStart);
  const projectedTotalMinor = projection.reduce(
    (sum, month) => sum + month.totalMinor,
    0,
  );
  const peakMonth = projection.reduce<ProjectionMonth | null>(
    (peak, month) =>
      month.totalMinor > 0 && month.totalMinor > (peak?.totalMinor ?? 0)
        ? month
        : peak,
    null,
  );

  return {
    currency,
    billingCount: billing.length,
    monthlyTotalMinor,
    annualRunRateMinor: monthlyTotalMinor * 12,
    projection,
    projectedTotalMinor,
    peakMonth,
    slices: categoryBreakdown(subs, currency),
    leaderboard: costLeaderboard(subs, currency),
  };
}
