import {
  BillingInterval,
  InsightType,
  SubscriptionStatus,
} from "@/generated/prisma/enums";
import { formatDay } from "@/lib/dates";
import {
  convertMinor,
  formatMoney,
  monthlyEquivalentInBaseMinor,
  monthlyEquivalentMinor,
} from "@/lib/money";
import { cycleSuffix } from "@/lib/recurrence";
import {
  resolveService,
  serviceIdentity,
  SERVICE_PURPOSE_LABELS,
  type ServicePurpose,
} from "@/lib/services";

/**
 * Rule-based insight generation — pure functions, no database access
 * (mirrors lib/renewal-ruler.ts for testability). The service layer feeds
 * subscriptions in and persists the candidates.
 *
 * When LLM-generated insights arrive (lib/ai/), they replace this module
 * behind the same regenerateInsights entry point — no schema change.
 *
 * REDUNDANCY IS DECIDED BY PURPOSE, NOT CATEGORY. An earlier version flagged
 * any two subscriptions sharing a category, which called Netflix and Spotify
 * redundant because both are filed under Entertainment. A category is a
 * filing label; lib/services.ts knows what a service is FOR. Services that
 * catalog doesn't recognize produce no redundancy insight at all — silence
 * beats telling someone to cancel a subscription they need.
 *
 * UNIT CONTRACT — savingsMinor is always a MONTHLY-EQUIVALENT amount in
 * the workspace default currency. The dashboard "recoverable" pill and
 * savings KPIs sum savingsMinor across insights; mixing a per-year figure
 * into that sum would be dishonest. Per-year amounts appear only in copy.
 *
 * dedupeKey grammar (stable identity per logical finding; a format change
 * loses users' dismissals):
 *   dup-service:{serviceIdentity}
 *   overlap:{servicePurpose}
 *   annual:{subscriptionId}
 *   trial:{subscriptionId}:{yyyy-mm-dd of trialEndsAt}
 */

/** Trials ending within this many days produce a TRIAL_ENDING insight. */
export const TRIAL_WINDOW_DAYS = 7;

/** Skip annual-switch suggestions below this monthly amount (minor units). */
export const ANNUAL_MIN_MONTHLY_MINOR = 500;

/** Annual plans commonly include ~2 months free — the v1 estimate. */
const ANNUAL_FREE_MONTHS = 2;

/** Names listed in overlap copy before collapsing to "and N more". */
const DUPLICATE_NAME_CAP = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RuleSubscription {
  id: string;
  name: string;
  /** Billing entity — a second chance to identify the service. */
  vendor: string | null;
  /** Service URL — the last chance, via its hostname. */
  url: string | null;
  amountMinor: number;
  currency: string;
  interval: BillingInterval;
  intervalCount: number;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
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

/** Deterministic member order: by name, then id as the tiebreaker. */
function byName(a: RuleSubscription, b: RuleSubscription): number {
  return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

/** Cheapest monthly-equivalent in the base currency — what cancelling frees. */
function cheapestMonthlyMinor(
  members: RuleSubscription[],
  defaultCurrency: string,
): number {
  return Math.min(
    ...members.map((sub) => monthlyEquivalentInBaseMinor(sub, defaultCurrency)),
  );
}

/** "the cheaper one" reads wrong for three; "the cheapest" reads wrong for two. */
function cheapestPhrase(count: number): string {
  return count === 2 ? "the cheaper one" : "the cheapest";
}

function activeSubscriptions(
  subscriptions: RuleSubscription[],
): RuleSubscription[] {
  return subscriptions.filter(
    (sub) => sub.status === SubscriptionStatus.ACTIVE,
  );
}

/**
 * The same service billed twice — two Netflix rows, not two video services.
 * The strongest signal we have: it's a billing mistake, not a lifestyle
 * choice, so it applies to unrecognized services too (matched on name).
 */
function duplicateServiceInsights(
  subscriptions: RuleSubscription[],
  defaultCurrency: string,
): InsightCandidate[] {
  const groups = new Map<string, RuleSubscription[]>();
  for (const sub of activeSubscriptions(subscriptions)) {
    const identity = serviceIdentity(sub);
    if (!identity) continue;
    const group = groups.get(identity);
    if (group) group.push(sub);
    else groups.set(identity, [sub]);
  }

  const candidates: InsightCandidate[] = [];
  for (const [identity, members] of groups) {
    if (members.length < 2) continue;
    members.sort(byName);

    const cheapest = cheapestMonthlyMinor(members, defaultCurrency);
    const label = members[0]!.name;

    candidates.push({
      type: InsightType.DUPLICATE_SERVICE,
      dedupeKey: `dup-service:${identity}`,
      title: `${members.length} ${label} subscriptions`,
      body: `You're tracking ${label} ${members.length} times, so you may be paying for it twice. Cancelling ${cheapestPhrase(members.length)} frees ${formatMoney(cheapest, defaultCurrency)}/mo.`,
      savingsMinor: cheapest,
      currency: defaultCurrency,
      subscriptionIds: members.map((sub) => sub.id),
      data: { v: 1, identity },
    });
  }
  return candidates;
}

/**
 * Different services doing the same job — Netflix and Disney+, not Netflix
 * and Spotify. Only recognized services participate; anything the catalog
 * can't identify is left alone.
 *
 * Members are collapsed by service identity first, so the same service billed
 * twice is reported by duplicateServiceInsights and never double-counted here.
 */
function serviceOverlapInsights(
  subscriptions: RuleSubscription[],
  defaultCurrency: string,
): InsightCandidate[] {
  const groups = new Map<ServicePurpose, Map<string, RuleSubscription>>();
  for (const sub of activeSubscriptions(subscriptions)) {
    const service = resolveService(sub);
    if (!service) continue;
    const group = groups.get(service.purpose) ?? new Map();
    // Keep the cheapest row per service: it's the one the savings figure and
    // the "cancel the cheapest" advice refer to.
    const held = group.get(service.canonical);
    if (
      !held ||
      monthlyEquivalentInBaseMinor(sub, defaultCurrency) <
        monthlyEquivalentInBaseMinor(held, defaultCurrency)
    ) {
      group.set(service.canonical, sub);
    }
    groups.set(service.purpose, group);
  }

  const candidates: InsightCandidate[] = [];
  for (const [purpose, byService] of groups) {
    const members = [...byService.values()].sort(byName);
    if (members.length < 2) continue;

    const cheapest = cheapestMonthlyMinor(members, defaultCurrency);
    const label = SERVICE_PURPOSE_LABELS[purpose];
    const verb = members.length === 2 ? "both cover" : "all cover";

    candidates.push({
      type: InsightType.SERVICE_OVERLAP,
      dedupeKey: `overlap:${purpose}`,
      title: `${members.length} subscriptions for ${label}`,
      body: `${nameList(members.map((sub) => sub.name))} ${verb} ${label}. If one is enough, dropping ${cheapestPhrase(members.length)} frees ${formatMoney(cheapest, defaultCurrency)}/mo.`,
      savingsMinor: cheapest,
      currency: defaultCurrency,
      subscriptionIds: members.map((sub) => sub.id),
      data: { v: 1, purpose },
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
      sub.intervalCount !== 1
    ) {
      continue;
    }
    // Convert the monthly charge into the base currency so the threshold,
    // the copy, and the saving are all denominated the same way.
    const monthlyBaseMinor = convertMinor(
      sub.amountMinor,
      sub.currency,
      defaultCurrency,
    );
    if (monthlyBaseMinor < ANNUAL_MIN_MONTHLY_MINOR) continue;

    // "~2 months free" estimate: exact integer per-year saving, then
    // normalized to the monthly-equivalent unit contract above.
    const yearlySavingsMinor = ANNUAL_FREE_MONTHS * monthlyBaseMinor;
    candidates.push({
      type: InsightType.ANNUAL_SAVINGS,
      dedupeKey: `annual:${sub.id}`,
      title: `Switch ${sub.name} to annual`,
      body: `You pay ${formatMoney(monthlyBaseMinor, defaultCurrency)}/mo. Annual plans typically include ~2 months free — about ${formatMoney(yearlySavingsMinor, defaultCurrency)} back a year.`,
      savingsMinor: monthlyEquivalentMinor(
        yearlySavingsMinor,
        BillingInterval.YEAR,
        1,
      ),
      currency: defaultCurrency,
      subscriptionIds: [sub.id],
      data: { v: 1, monthlyMinor: monthlyBaseMinor, yearlySavingsMinor },
    });
  }
  return candidates;
}

function trialInsights(
  subscriptions: RuleSubscription[],
  now: Date,
  defaultCurrency: string,
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
      body: `Converts to ${formatMoney(convertMinor(sub.amountMinor, sub.currency, defaultCurrency), defaultCurrency)}${cycleSuffix(sub.interval, sub.intervalCount)} unless cancelled.`,
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
    ...duplicateServiceInsights(subscriptions, defaultCurrency),
    ...serviceOverlapInsights(subscriptions, defaultCurrency),
    ...annualInsights(subscriptions, defaultCurrency),
    ...trialInsights(subscriptions, now, defaultCurrency),
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
  return insights.reduce((sum, insight) => {
    if (insight.savingsMinor === null || insight.currency === null) return sum;
    return sum + convertMinor(insight.savingsMinor, insight.currency, currency);
  }, 0);
}
