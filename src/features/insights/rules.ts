import {
  BillingInterval,
  InsightType,
  SubscriptionStatus,
} from "@/generated/prisma/enums";
import { formatDay } from "@/lib/dates";
import { formatMoney, monthlyEquivalentMinor } from "@/lib/money";
import { cycleSuffix } from "@/lib/recurrence";

/**
 * Rule-based insight generation — pure functions, no database access
 * (mirrors lib/renewal-ruler.ts for testability). The service layer feeds
 * subscriptions in and persists the candidates.
 *
 * When LLM-generated insights arrive (lib/ai/), they replace this module
 * behind the same regenerateInsights entry point — no schema change.
 *
 * UNIT CONTRACT — savingsMinor is always a MONTHLY-EQUIVALENT amount in
 * the workspace default currency. The dashboard "recoverable" pill and
 * savings KPIs sum savingsMinor across insights; mixing a per-year figure
 * into that sum would be dishonest. Per-year amounts appear only in copy.
 *
 * dedupeKey grammar (stable identity per logical finding; a format change
 * loses users' dismissals):
 *   duplicate:{categoryId}
 *   annual:{subscriptionId}
 *   trial:{subscriptionId}:{yyyy-mm-dd of trialEndsAt}
 */

/** Trials ending within this many days produce a TRIAL_ENDING insight. */
export const TRIAL_WINDOW_DAYS = 7;

/** Skip annual-switch suggestions below this monthly amount (minor units). */
export const ANNUAL_MIN_MONTHLY_MINOR = 500;

/** Annual plans commonly include ~2 months free — the v1 estimate. */
const ANNUAL_FREE_MONTHS = 2;

/** Names listed in duplicate copy before collapsing to "and N more". */
const DUPLICATE_NAME_CAP = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RuleSubscription {
  id: string;
  name: string;
  amountMinor: number;
  currency: string;
  interval: BillingInterval;
  intervalCount: number;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  category: { id: string; name: string } | null;
}

export interface InsightCandidate {
  type: InsightType;
  dedupeKey: string;
  title: string;
  body: string;
  savingsMinor: number | null;
  currency: string | null;
  subscriptionIds: string[];
  /** Versioned payload — always `{ v: 1, ... }`; shape owned here. */
  data: Record<string, unknown>;
}

/** "A and B", "A, B, and C", "A, B, C, and 2 more". */
function nameList(names: string[]): string {
  const shown = names.slice(0, DUPLICATE_NAME_CAP);
  const extra = names.length - shown.length;
  const parts = extra > 0 ? [...shown, `${extra} more`] : shown;
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function duplicateInsights(
  subscriptions: RuleSubscription[],
  defaultCurrency: string,
): InsightCandidate[] {
  const groups = new Map<
    string,
    { categoryName: string; members: RuleSubscription[] }
  >();
  for (const sub of subscriptions) {
    if (sub.status !== SubscriptionStatus.ACTIVE || !sub.category) continue;
    const group = groups.get(sub.category.id);
    if (group) group.members.push(sub);
    else
      groups.set(sub.category.id, {
        categoryName: sub.category.name,
        members: [sub],
      });
  }

  const candidates: InsightCandidate[] = [];
  for (const [categoryId, group] of groups) {
    if (group.members.length < 2) continue;
    group.members.sort(
      (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
    );

    const cheapestMonthly = group.members
      .filter((sub) => sub.currency === defaultCurrency)
      .reduce<number | null>((min, sub) => {
        const monthly = monthlyEquivalentMinor(
          sub.amountMinor,
          sub.interval,
          sub.intervalCount,
        );
        return min === null ? monthly : Math.min(min, monthly);
      }, null);

    const names = nameList(group.members.map((sub) => sub.name));
    const verb = group.members.length === 2 ? "both bill" : "all bill";
    const tail =
      cheapestMonthly !== null
        ? `Cancelling the cheapest frees ${formatMoney(cheapestMonthly, defaultCurrency)}/mo.`
        : "Worth keeping just one.";

    candidates.push({
      type: InsightType.DUPLICATE_CATEGORY,
      dedupeKey: `duplicate:${categoryId}`,
      title: `${group.members.length} overlapping ${group.categoryName} subscriptions`,
      body: `${names} ${verb} in ${group.categoryName}. ${tail}`,
      savingsMinor: cheapestMonthly,
      currency: cheapestMonthly !== null ? defaultCurrency : null,
      subscriptionIds: group.members.map((sub) => sub.id),
      data: { v: 1, categoryId, categoryName: group.categoryName },
    });
  }
  return candidates;
}

function annualInsights(
  subscriptions: RuleSubscription[],
  defaultCurrency: string,
): InsightCandidate[] {
  const candidates: InsightCandidate[] = [];
  for (const sub of subscriptions) {
    if (
      sub.status !== SubscriptionStatus.ACTIVE ||
      sub.interval !== BillingInterval.MONTH ||
      sub.intervalCount !== 1 ||
      sub.currency !== defaultCurrency ||
      sub.amountMinor < ANNUAL_MIN_MONTHLY_MINOR
    ) {
      continue;
    }

    // "~2 months free" estimate: exact integer per-year saving, then
    // normalized to the monthly-equivalent unit contract above.
    const yearlySavingsMinor = ANNUAL_FREE_MONTHS * sub.amountMinor;
    candidates.push({
      type: InsightType.ANNUAL_SAVINGS,
      dedupeKey: `annual:${sub.id}`,
      title: `Switch ${sub.name} to annual`,
      body: `You pay ${formatMoney(sub.amountMinor, sub.currency)}/mo. Annual plans typically include ~2 months free — about ${formatMoney(yearlySavingsMinor, sub.currency)} back a year.`,
      savingsMinor: monthlyEquivalentMinor(
        yearlySavingsMinor,
        BillingInterval.YEAR,
        1,
      ),
      currency: defaultCurrency,
      subscriptionIds: [sub.id],
      data: { v: 1, monthlyMinor: sub.amountMinor, yearlySavingsMinor },
    });
  }
  return candidates;
}

function trialInsights(
  subscriptions: RuleSubscription[],
  now: Date,
): InsightCandidate[] {
  const windowEnd = now.getTime() + TRIAL_WINDOW_DAYS * DAY_MS;
  const candidates: InsightCandidate[] = [];
  for (const sub of subscriptions) {
    if (
      sub.status !== SubscriptionStatus.TRIAL ||
      !sub.trialEndsAt ||
      sub.trialEndsAt.getTime() < now.getTime() ||
      sub.trialEndsAt.getTime() > windowEnd
    ) {
      continue;
    }

    candidates.push({
      type: InsightType.TRIAL_ENDING,
      // Date in the key: an extended trial is a new deadline and deserves
      // a fresh insight even if the old one was dismissed.
      dedupeKey: `trial:${sub.id}:${sub.trialEndsAt.toISOString().slice(0, 10)}`,
      title: `${sub.name} trial ends ${formatDay(sub.trialEndsAt, now)}`,
      body: `Converts to ${formatMoney(sub.amountMinor, sub.currency)}${cycleSuffix(sub.interval, sub.intervalCount)} unless cancelled.`,
      // A deadline, not a saving — keeps the "recoverable" sum honest.
      savingsMinor: null,
      currency: null,
      subscriptionIds: [sub.id],
      data: { v: 1, trialEndsAt: sub.trialEndsAt.toISOString() },
    });
  }
  return candidates;
}

/**
 * All insight candidates for a workspace's non-deleted subscriptions.
 * Deterministic: same input set produces the same candidates in the same
 * order regardless of input order.
 */
export function computeInsights(args: {
  subscriptions: RuleSubscription[];
  defaultCurrency: string;
  now: Date;
}): InsightCandidate[] {
  const { subscriptions, defaultCurrency, now } = args;
  return [
    ...duplicateInsights(subscriptions, defaultCurrency),
    ...annualInsights(subscriptions, defaultCurrency),
    ...trialInsights(subscriptions, now),
  ].sort((a, b) => a.dedupeKey.localeCompare(b.dedupeKey));
}

/**
 * Sum of savings in the display currency — the "recoverable" pill. Shared
 * by the dashboard panel and the insights page so the figure never forks.
 */
export function recoverableTotalMinor(
  insights: { savingsMinor: number | null; currency: string | null }[],
  currency: string,
): number {
  return insights.reduce(
    (sum, insight) =>
      insight.currency === currency ? sum + (insight.savingsMinor ?? 0) : sum,
    0,
  );
}
