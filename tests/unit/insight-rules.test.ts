import { describe, expect, it } from "vitest";
import {
  BillingInterval,
  InsightType,
  SubscriptionStatus,
} from "@/generated/prisma/enums";
import {
  computeInsights,
  recoverableTotalMinor,
  TRIAL_WINDOW_DAYS,
  type RuleSubscription,
} from "@/features/insights/rules";

const NOW = new Date(Date.UTC(2026, 6, 25));
const DAY_MS = 24 * 60 * 60 * 1000;

const ENTERTAINMENT = { id: "cat-ent", name: "Entertainment" };
const DESIGN = { id: "cat-design", name: "Design" };

let nextId = 0;
function sub(overrides: Partial<RuleSubscription> = {}): RuleSubscription {
  nextId += 1;
  return {
    id: `sub-${nextId}`,
    name: `Service ${nextId}`,
    amountMinor: 1000,
    currency: "USD",
    interval: BillingInterval.MONTH,
    intervalCount: 1,
    status: SubscriptionStatus.ACTIVE,
    trialEndsAt: null,
    category: null,
    ...overrides,
  };
}

function compute(subscriptions: RuleSubscription[], defaultCurrency = "USD") {
  return computeInsights({ subscriptions, defaultCurrency, now: NOW });
}

function ofType(subscriptions: RuleSubscription[], type: InsightType) {
  return compute(subscriptions).filter((c) => c.type === type);
}

describe("DUPLICATE_CATEGORY", () => {
  it("flags two active subscriptions sharing a category", () => {
    const a = sub({
      name: "Netflix",
      amountMinor: 1549,
      category: ENTERTAINMENT,
    });
    const b = sub({
      name: "Spotify",
      amountMinor: 1099,
      category: ENTERTAINMENT,
    });
    const [insight] = ofType([a, b], InsightType.DUPLICATE_CATEGORY);

    expect(insight).toBeDefined();
    expect(insight!.dedupeKey).toBe("duplicate:cat-ent");
    expect(insight!.title).toBe("2 overlapping Entertainment subscriptions");
    expect(insight!.body).toContain("Netflix and Spotify both bill");
    // Savings = cheapest monthly equivalent in the default currency.
    expect(insight!.savingsMinor).toBe(1099);
    expect(insight!.currency).toBe("USD");
    expect(insight!.subscriptionIds).toEqual(
      expect.arrayContaining([a.id, b.id]),
    );
  });

  it("does not flag a single subscription or distinct categories", () => {
    const single = sub({ category: ENTERTAINMENT });
    const other = sub({ category: DESIGN });
    expect(ofType([single, other], InsightType.DUPLICATE_CATEGORY)).toEqual([]);
  });

  it("ignores non-ACTIVE and uncategorized subscriptions", () => {
    const active = sub({ category: ENTERTAINMENT });
    const paused = sub({
      category: ENTERTAINMENT,
      status: SubscriptionStatus.PAUSED,
    });
    const trial = sub({
      category: ENTERTAINMENT,
      status: SubscriptionStatus.TRIAL,
    });
    const uncategorized = sub();
    expect(
      ofType(
        [active, paused, trial, uncategorized],
        InsightType.DUPLICATE_CATEGORY,
      ),
    ).toEqual([]);
  });

  it("collapses long name lists and uses 'all bill' for 3+", () => {
    const members = ["A", "B", "C", "D", "E"].map((name) =>
      sub({ name, category: ENTERTAINMENT }),
    );
    const [insight] = ofType(members, InsightType.DUPLICATE_CATEGORY);
    expect(insight!.title).toBe("5 overlapping Entertainment subscriptions");
    expect(insight!.body).toContain("A, B, C, and 2 more all bill");
  });

  it("converts foreign-currency members for the savings figure", () => {
    // Two €10/mo subs → cheapest converts to $10.87/mo in the base currency.
    const a = sub({ currency: "EUR", category: ENTERTAINMENT });
    const b = sub({ currency: "EUR", category: ENTERTAINMENT });
    const [insight] = ofType([a, b], InsightType.DUPLICATE_CATEGORY);
    expect(insight!.savingsMinor).toBe(1087);
    expect(insight!.currency).toBe("USD");
    expect(insight!.body).toContain("$10.87");
  });

  it("normalizes mixed cadences to monthly equivalents for the savings figure", () => {
    // $120/yr = $10/mo — cheaper than the $15.49/mo sibling.
    const yearly = sub({
      amountMinor: 12000,
      interval: BillingInterval.YEAR,
      category: ENTERTAINMENT,
    });
    const monthly = sub({ amountMinor: 1549, category: ENTERTAINMENT });
    const [insight] = ofType([yearly, monthly], InsightType.DUPLICATE_CATEGORY);
    expect(insight!.savingsMinor).toBe(1000);
  });
});

describe("ANNUAL_SAVINGS", () => {
  it("estimates two months free for a monthly subscription", () => {
    const netflix = sub({ name: "Netflix", amountMinor: 1549 });
    const [insight] = ofType([netflix], InsightType.ANNUAL_SAVINGS);

    expect(insight!.dedupeKey).toBe(`annual:${netflix.id}`);
    expect(insight!.title).toBe("Switch Netflix to annual");
    // 2 × $15.49 = $30.98/yr, normalized monthly: round(3098 / 12) = 258.
    expect(insight!.body).toContain("$30.98");
    expect(insight!.savingsMinor).toBe(258);
    expect(insight!.currency).toBe("USD");
  });

  it("skips non-monthly cadences, multi-month counts, and trivial amounts", () => {
    const yearly = sub({ interval: BillingInterval.YEAR });
    const weekly = sub({ interval: BillingInterval.WEEK });
    const quarterly = sub({ intervalCount: 3 });
    const trivial = sub({ amountMinor: 499 });
    const paused = sub({ status: SubscriptionStatus.PAUSED });
    expect(
      ofType(
        [yearly, weekly, quarterly, trivial, paused],
        InsightType.ANNUAL_SAVINGS,
      ),
    ).toEqual([]);
  });

  it("converts foreign-currency subscriptions into the base currency", () => {
    // €10/mo → ~$10.87/mo, above the threshold, denominated in the base.
    const eur = sub({ currency: "EUR" });
    const [insight] = ofType([eur], InsightType.ANNUAL_SAVINGS);
    expect(insight).toBeDefined();
    expect(insight!.currency).toBe("USD");
    expect(insight!.body).toContain("$10.87");
  });
});

describe("TRIAL_ENDING", () => {
  function trialSub(
    endsInDays: number,
    overrides: Partial<RuleSubscription> = {},
  ) {
    return sub({
      status: SubscriptionStatus.TRIAL,
      trialEndsAt: new Date(NOW.getTime() + endsInDays * DAY_MS),
      ...overrides,
    });
  }

  it("flags a trial ending within the window, with converting price", () => {
    const s = trialSub(3, { name: "Midjourney", amountMinor: 1000 });
    const [insight] = ofType([s], InsightType.TRIAL_ENDING);

    expect(insight!.dedupeKey).toBe(`trial:${s.id}:2026-07-28`);
    expect(insight!.title).toContain("Midjourney trial ends");
    expect(insight!.body).toBe("Converts to $10.00/mo unless cancelled.");
    expect(insight!.savingsMinor).toBeNull();
  });

  it("includes the window boundaries and excludes outside them", () => {
    const atNow = trialSub(0);
    const atEdge = trialSub(TRIAL_WINDOW_DAYS);
    const past = trialSub(-1);
    const beyond = trialSub(TRIAL_WINDOW_DAYS + 1);
    const keys = ofType(
      [atNow, atEdge, past, beyond],
      InsightType.TRIAL_ENDING,
    ).flatMap((c) => c.subscriptionIds);
    expect(keys).toEqual(expect.arrayContaining([atNow.id, atEdge.id]));
    expect(keys).toHaveLength(2);
  });

  it("ignores TRIAL status without a trialEndsAt, and non-TRIAL statuses", () => {
    const noDate = sub({ status: SubscriptionStatus.TRIAL });
    const active = sub({
      trialEndsAt: new Date(NOW.getTime() + 2 * DAY_MS),
    });
    expect(ofType([noDate, active], InsightType.TRIAL_ENDING)).toEqual([]);
  });
});

describe("computeInsights determinism", () => {
  it("produces identical output regardless of input order", () => {
    const subs = [
      sub({ name: "Netflix", amountMinor: 1549, category: ENTERTAINMENT }),
      sub({ name: "Spotify", amountMinor: 1099, category: ENTERTAINMENT }),
      sub({ name: "Figma", amountMinor: 1500 }),
    ];
    const forward = compute(subs);
    const reversed = compute([...subs].reverse());
    expect(reversed).toEqual(forward);
  });
});

describe("recoverableTotalMinor", () => {
  it("converts each saving into the display currency", () => {
    // €5 → ~$5.43, added to the $10.00; the null saving is skipped.
    const total = recoverableTotalMinor(
      [
        { savingsMinor: 1000, currency: "USD" },
        { savingsMinor: 500, currency: "EUR" },
        { savingsMinor: null, currency: null },
      ],
      "USD",
    );
    expect(total).toBe(1543);
  });
});
