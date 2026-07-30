import { BillingInterval, SubscriptionStatus } from "@/generated/prisma/enums";
import { convertMinor, monthlyEquivalentInBaseMinor } from "@/lib/money";
import { BILLING_STATUSES } from "@/lib/subscription-status";
import { cycleSuffix, renewalOccurrencesBetween } from "@/lib/recurrence";

/**
 * Pure analytics aggregations — no DB, no React, exhaustively testable.
 *
 * Money rule (matches the dashboard): every amount is converted into the
 * workspace base currency, so aggregates include all billing subscriptions
 * regardless of their original currency.
 */

export const PROJECTION_MONTHS = 12;
export const LEADERBOARD_LIMIT = 10;
export const UNCATEGORIZED_ID = "uncategorized";

export interface AnalyticsSub {
  id: string;
  name: string;
  color: string | null;
  amountMinor: number;
  currency: string;
  interval: BillingInterval;
  intervalCount: number;
  anchorDate: Date;
  status: SubscriptionStatus;
  category: { id: string; name: string; color: string } | null;
}

function included(subs: AnalyticsSub[]): AnalyticsSub[] {
  return subs.filter((sub) => BILLING_STATUSES.has(sub.status));
}

export interface CategorySlice {
  /** Category.id, or UNCATEGORIZED_ID for the null bucket. */
  id: string;
  name: string;
  /** null (uncategorized) renders as the faint token, never a palette hue. */
  color: string | null;
  monthlyMinor: number;
  /** 0..1 of the included monthly total; 0 when the total is 0. */
  share: number;
  count: number;
}

/** Share of monthly-equivalent spend per category, sorted descending. */
export function categoryBreakdown(
  subs: AnalyticsSub[],
  currency: string,
): CategorySlice[] {
  const slices = new Map<string, CategorySlice>();
  let totalMinor = 0;
  for (const sub of included(subs)) {
    const key = sub.category?.id ?? UNCATEGORIZED_ID;
    let slice = slices.get(key);
    if (!slice) {
      slice = {
        id: key,
        name: sub.category?.name ?? "Uncategorized",
        color: sub.category?.color ?? null,
        monthlyMinor: 0,
        share: 0,
        count: 0,
      };
      slices.set(key, slice);
    }
    const amount = monthlyEquivalentInBaseMinor(sub, currency);
    slice.monthlyMinor += amount;
    slice.count += 1;
    totalMinor += amount;
  }
  const sorted = [...slices.values()].sort(
    (a, b) => b.monthlyMinor - a.monthlyMinor,
  );
  if (totalMinor > 0) {
    for (const slice of sorted) slice.share = slice.monthlyMinor / totalMinor;
  }
  return sorted;
}

export interface ProjectionMonth {
  /** "2026-08" — stable identity across the year boundary. */
  key: string;
  /** "Aug" — mono axis tick. */
  label: string;
  /** "Aug 2026" — tooltip / captions. */
  longLabel: string;
  /** Sum of ACTUAL charge amounts that month — not monthly equivalents. */
  totalMinor: number;
  /** Number of charges that month. */
  count: number;
}

const MONTH_SHORT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});
const MONTH_LONG = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Real upcoming charges bucketed into the next `months` full calendar
 * months, starting the month AFTER `todayStart` (the user's zoned today as
 * UTC midnight). The partial current month is the dashboard ruler's job —
 * full months keep the bars comparable.
 */
export function projectionByMonth(
  subs: AnalyticsSub[],
  currency: string,
  todayStart: Date,
  months = PROJECTION_MONTHS,
): ProjectionMonth[] {
  const y = todayStart.getUTCFullYear();
  const mIdx = todayStart.getUTCMonth();

  const buckets = new Map<string, ProjectionMonth>();
  for (let i = 1; i <= months; i++) {
    const first = new Date(Date.UTC(y, mIdx + i, 1));
    const key = `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, {
      key,
      label: MONTH_SHORT.format(first),
      longLabel: MONTH_LONG.format(first),
      totalMinor: 0,
      count: 0,
    });
  }

  // renewalOccurrencesBetween is (from, to]: from = last day of the current
  // month (excluded), to = last day of the final bucket.
  const from = new Date(Date.UTC(y, mIdx + 1, 0));
  const to = new Date(Date.UTC(y, mIdx + 1 + months, 0));
  for (const sub of included(subs)) {
    const amountInBase = convertMinor(sub.amountMinor, sub.currency, currency);
    for (const occurrence of renewalOccurrencesBetween(
      sub.anchorDate,
      sub.interval,
      sub.intervalCount,
      from,
      to,
    )) {
      const key = `${occurrence.getUTCFullYear()}-${String(occurrence.getUTCMonth() + 1).padStart(2, "0")}`;
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.totalMinor += amountInBase;
      bucket.count += 1;
    }
  }
  return [...buckets.values()];
}

export interface LeaderboardRow {
  id: string;
  name: string;
  /** Sub brand hue for the letter avatar (may be null). */
  color: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  /** Raw price + cycle for the faint subline ("$119.88/yr"). */
  amountMinor: number;
  currency: string;
  cycle: string;
  monthlyMinor: number;
  /** 0..1 of the included monthly total; 0 when the total is 0. */
  share: number;
}

/** All included subs ranked by monthly-equivalent cost, descending. */
export function costLeaderboard(
  subs: AnalyticsSub[],
  currency: string,
): LeaderboardRow[] {
  const rows = included(subs).map((sub) => ({
    id: sub.id,
    name: sub.name,
    color: sub.color,
    categoryName: sub.category?.name ?? null,
    categoryColor: sub.category?.color ?? null,
    amountMinor: convertMinor(sub.amountMinor, sub.currency, currency),
    currency,
    cycle: cycleSuffix(sub.interval, sub.intervalCount),
    monthlyMinor: monthlyEquivalentInBaseMinor(sub, currency),
    share: 0,
  }));
  const totalMinor = rows.reduce((sum, row) => sum + row.monthlyMinor, 0);
  if (totalMinor > 0) {
    for (const row of rows) row.share = row.monthlyMinor / totalMinor;
  }
  return rows.sort((a, b) => b.monthlyMinor - a.monthlyMinor);
}
