import { cache } from "react";
import { db } from "@/lib/db";
import { daysUntil, todayInZone, zonedYMD } from "@/lib/dates";
import { convertMinor, monthlyEquivalentInBaseMinor } from "@/lib/money";
import { renewalOccurrencesBetween } from "@/lib/recurrence";
import { RULER_DAYS, type RulerItem } from "@/lib/renewal-ruler";
import { BILLING_STATUSES } from "@/lib/subscription-status";
import { BillingInterval, SubscriptionStatus } from "@/generated/prisma/enums";
import { cycleSuffix } from "@/lib/recurrence";

/**
 * One scoped fetch layer for the dashboard. A single subscriptions query
 * feeds every widget (no N+1); aggregation happens in JS at personal scale.
 *
 * Currency: every money figure is converted into the workspace base currency
 * (convertMinor) before summing, so totals include all subscriptions
 * regardless of their original currency — the dashboard shows one currency.
 */

const TREND_MONTHS = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface SubscriptionLite {
  id: string;
  name: string;
  color: string | null;
  amountMinor: number;
  currency: string;
  interval: BillingInterval;
  intervalCount: number;
  anchorDate: Date;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  categoryId: string | null;
  category: { id: string; name: string; slug: string; color: string } | null;
}

export interface AccordionCategory {
  id: string;
  name: string;
  slug: string;
  color: string;
  monthlyTotalMinor: number;
  currency: string;
  children: {
    id: string;
    name: string;
    /** Monthly-equivalent spend in base currency — children sum to the total. */
    monthlyMinor: number;
  }[];
}

export interface DashboardKpis {
  scopeLabel: string | null;
  monthlySpendMinor: number;
  billingCount: number;
  activeCount: number;
  trialCount: number;
  renewingThisWeekCount: number;
  renewingThisWeekMinor: number;
  currency: string;
}

export interface TrendPoint {
  month: string;
  amountMinor: number;
}

export interface DashboardData {
  kpis: DashboardKpis;
  rulerItems: RulerItem[];
  rulerTotalMinor: number;
  trend: TrendPoint[];
  accordion: AccordionCategory[];
  defaultCurrency: string;
}

/** Request-cached so layout (accordion), dashboard, and analytics share one
 * query per request. */
export const fetchWorkspaceSubs = cache(async (workspaceId: string) => {
  return Promise.all([
    db.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { defaultCurrency: true },
    }),
    db.subscription.findMany({
      where: { workspaceId, deletedAt: null },
      select: {
        id: true,
        name: true,
        color: true,
        amountMinor: true,
        currency: true,
        interval: true,
        intervalCount: true,
        anchorDate: true,
        status: true,
        trialEndsAt: true,
        categoryId: true,
        category: {
          select: { id: true, name: true, slug: true, color: true },
        },
      },
    }),
  ] as const);
});

export async function getDashboardData(
  workspaceId: string,
  categorySlug?: string,
  timeZone = "UTC",
): Promise<DashboardData> {
  const [workspace, subs] = await fetchWorkspaceSubs(workspaceId);

  const currency = workspace.defaultCurrency;
  const monthlyBase = (sub: SubscriptionLite) =>
    monthlyEquivalentInBaseMinor(sub, currency);
  const now = new Date();
  // Renewal windows count from the user's local today (UTC midnight of that
  // calendar day), so today's renewals don't vanish before the user's day ends.
  const todayStart = todayInZone(timeZone, now);

  // ----- Accordion (always unscoped: it IS the scope selector) -----
  const categories = new Map<string, AccordionCategory>();
  for (const sub of subs) {
    if (!sub.category || !BILLING_STATUSES.has(sub.status)) continue;
    let entry = categories.get(sub.category.id);
    if (!entry) {
      entry = {
        ...sub.category,
        monthlyTotalMinor: 0,
        currency,
        children: [],
      };
      categories.set(sub.category.id, entry);
    }
    entry.monthlyTotalMinor += monthlyBase(sub);
    entry.children.push({
      id: sub.id,
      name: sub.name,
      // Monthly-equivalent in base, so the children sum exactly to the header.
      monthlyMinor: monthlyBase(sub),
    });
  }
  const accordion = [...categories.values()].sort(
    (a, b) => b.monthlyTotalMinor - a.monthlyTotalMinor,
  );
  for (const entry of accordion) {
    entry.children.sort((a, b) => b.monthlyMinor - a.monthlyMinor);
  }

  // ----- Scope -----
  const scopeCategory = categorySlug
    ? accordion.find((c) => c.slug === categorySlug)
    : undefined;
  const scoped = scopeCategory
    ? subs.filter((sub) => sub.category?.slug === categorySlug)
    : subs;
  const billing = scoped.filter((sub) => BILLING_STATUSES.has(sub.status));

  // ----- KPIs -----
  const weekWindow = new Date(todayStart.getTime() + 7 * DAY_MS);
  let renewingThisWeekCount = 0;
  let renewingThisWeekMinor = 0;
  for (const sub of billing) {
    const occurrences = renewalOccurrencesBetween(
      sub.anchorDate,
      sub.interval,
      sub.intervalCount,
      todayStart,
      weekWindow,
    );
    if (occurrences.length > 0) {
      renewingThisWeekCount += 1;
      renewingThisWeekMinor +=
        convertMinor(sub.amountMinor, sub.currency, currency) *
        occurrences.length;
    }
  }

  const kpis: DashboardKpis = {
    scopeLabel: scopeCategory?.name ?? null,
    monthlySpendMinor: billing.reduce((sum, sub) => sum + monthlyBase(sub), 0),
    billingCount: billing.length,
    activeCount: scoped.filter((s) => s.status === SubscriptionStatus.ACTIVE)
      .length,
    trialCount: scoped.filter((s) => s.status === SubscriptionStatus.TRIAL)
      .length,
    renewingThisWeekCount,
    renewingThisWeekMinor,
    currency,
  };

  // ----- Renewal Ruler (next 30 days, every occurrence) -----
  const rulerWindow = new Date(todayStart.getTime() + RULER_DAYS * DAY_MS);
  const rulerItems: RulerItem[] = [];
  let rulerTotalMinor = 0;
  for (const sub of billing) {
    const amountInBase = convertMinor(sub.amountMinor, sub.currency, currency);
    for (const occurrence of renewalOccurrencesBetween(
      sub.anchorDate,
      sub.interval,
      sub.intervalCount,
      todayStart,
      rulerWindow,
    )) {
      rulerItems.push({
        id: `${sub.id}:${occurrence.toISOString()}`,
        day: daysUntil(occurrence, todayStart),
        amountMinor: amountInBase,
        currency,
        name: sub.name,
        color: sub.color,
        cycle: cycleSuffix(sub.interval, sub.intervalCount),
        category: sub.category?.name ?? null,
      });
      rulerTotalMinor += amountInBase;
    }
  }

  // ----- Spending trend (last 6 months, derived from current state) -----
  // Honest approximation: no price history exists (accepted v1 debt), so a
  // month's spend = monthly equivalents of billing subs whose anchorDate
  // precedes that month's end.
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  const trend: TrendPoint[] = [];
  const { y: nowYear, m: nowMonth } = zonedYMD(now, timeZone);
  for (let i = TREND_MONTHS - 1; i >= 0; i--) {
    // nowMonth is 1-based: month index (nowMonth - i), day 0 = last day of
    // the calendar month (nowMonth - i) in the user's zone.
    const monthEnd = new Date(Date.UTC(nowYear, nowMonth - i, 0));
    trend.push({
      month: monthLabel.format(monthEnd),
      amountMinor: billing
        .filter((sub) => sub.anchorDate.getTime() <= monthEnd.getTime())
        .reduce((sum, sub) => sum + monthlyBase(sub), 0),
    });
  }

  return {
    kpis,
    rulerItems,
    rulerTotalMinor,
    trend,
    accordion,
    defaultCurrency: currency,
  };
}
