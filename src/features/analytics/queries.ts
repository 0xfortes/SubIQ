import { fetchWorkspaceSubs } from "@/features/dashboard";
import { todayInZone } from "@/lib/dates";
import { monthlyEquivalentMinor } from "@/lib/money";
import {
  categoryBreakdown,
  costLeaderboard,
  foreignBillingCount,
  projectionByMonth,
  type CategorySlice,
  type LeaderboardRow,
  type ProjectionMonth,
} from "./lib";
import { SubscriptionStatus } from "@/generated/prisma/enums";

/** Keep in sync with dashboard/queries.ts BILLING. */
const BILLING = new Set<SubscriptionStatus>([
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIAL,
]);

export interface AnalyticsData {
  currency: string;
  /** All billing subs, any currency. */
  billingCount: number;
  /** Billing subs in the default currency — what the money figures cover. */
  includedCount: number;
  foreignCount: number;
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

  const billing = subs.filter((sub) => BILLING.has(sub.status));
  const includedSubs = billing.filter((sub) => sub.currency === currency);
  const monthlyTotalMinor = includedSubs.reduce(
    (sum, sub) =>
      sum +
      monthlyEquivalentMinor(sub.amountMinor, sub.interval, sub.intervalCount),
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
    includedCount: includedSubs.length,
    foreignCount: foreignBillingCount(subs, currency),
    monthlyTotalMinor,
    annualRunRateMinor: monthlyTotalMinor * 12,
    projection,
    projectedTotalMinor,
    peakMonth,
    slices: categoryBreakdown(subs, currency),
    leaderboard: costLeaderboard(subs, currency),
  };
}
