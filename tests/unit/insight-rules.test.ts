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

let nextId = 0;
function sub(overrides: Partial<RuleSubscription> = {}): RuleSubscription {
  nextId += 1;
  return {
    id: `sub-${nextId}`,
    // Default names are deliberately unrecognizable AND unique, so a test
    // only sees a redundancy insight when it asks for one.
    name: `Unknown Service ${nextId}`,
    vendor: null,
    url: null,
    amountMinor: 1000,
    currency: "USD",
    interval: BillingInterval.MONTH,
    intervalCount: 1,
    status: SubscriptionStatus.ACTIVE,
    trialEndsAt: null,
    ...overrides,
  };
}

function compute(subscriptions: RuleSubscription[], defaultCurrency = "USD") {
  return computeInsights({ subscriptions, defaultCurrency, now: NOW });
}

function ofType(subscriptions: RuleSubscription[], type: InsightType) {
  return compute(subscriptions).filter((c) => c.type === type);
}

describe("DUPLICATE_SERVICE", () => {
  it("flags the same service billed twice", () => {
    const a = sub({ name: "Netflix", amountMinor: 1549 });
    const b = sub({ name: "Netflix", amountMinor: 1099 });
    const [insight] = ofType([a, b], InsightType.DUPLICATE_SERVICE);

    expect(insight).toBeDefined();
    expect(insight!.dedupeKey).toBe("dup-service:netflix");
    expect(insight!.title).toBe("2 Netflix subscriptions");
    expect(insight!.body).toContain("you may be paying for it twice");
    // Savings = cheapest monthly equivalent in the default currency.
    expect(insight!.savingsMinor).toBe(1099);
    expect(insight!.currency).toBe("USD");
    expect(insight!.subscriptionIds).toEqual(
      expect.arrayContaining([a.id, b.id]),
    );
  });

  it("sees through plan tiers and vendor/URL spellings", () => {
    const byTier = ofType(
      [sub({ name: "Netflix Premium" }), sub({ name: "Netflix" })],
      InsightType.DUPLICATE_SERVICE,
    );
    expect(byTier).toHaveLength(1);

    const byVendor = ofType(
      [
        sub({ name: "Family plan", vendor: "Netflix" }),
        sub({ name: "Netflix" }),
      ],
      InsightType.DUPLICATE_SERVICE,
    );
    expect(byVendor).toHaveLength(1);

    const byUrl = ofType(
      [
        sub({ name: "Movies", url: "https://www.netflix.com/account" }),
        sub({ name: "Netflix" }),
      ],
      InsightType.DUPLICATE_SERVICE,
    );
    expect(byUrl).toHaveLength(1);
  });

  it("catches duplicates of services the catalog doesn't know", () => {
    // A billing mistake is a billing mistake whether we recognize the brand.
    const a = sub({ name: "Bob's Gym" });
    const b = sub({ name: "bobs gym" });
    const [insight] = ofType([a, b], InsightType.DUPLICATE_SERVICE);
    expect(insight).toBeDefined();
    expect(insight!.dedupeKey).toBe("dup-service:bobs gym");
  });

  it("ignores single subscriptions and non-ACTIVE statuses", () => {
    const active = sub({ name: "Netflix" });
    const paused = sub({ name: "Netflix", status: SubscriptionStatus.PAUSED });
    const trial = sub({ name: "Netflix", status: SubscriptionStatus.TRIAL });
    expect(
      ofType([active, paused, trial], InsightType.DUPLICATE_SERVICE),
    ).toEqual([]);
  });
});

describe("SERVICE_OVERLAP", () => {
  it("flags different services that do the same job", () => {
    const netflix = sub({ name: "Netflix", amountMinor: 1549 });
    const disney = sub({ name: "Disney+", amountMinor: 1099 });
    const [insight] = ofType([netflix, disney], InsightType.SERVICE_OVERLAP);

    expect(insight).toBeDefined();
    expect(insight!.dedupeKey).toBe("overlap:VIDEO_STREAMING");
    expect(insight!.title).toBe("2 subscriptions for video streaming");
    expect(insight!.body).toContain("Disney+ and Netflix both cover");
    expect(insight!.savingsMinor).toBe(1099);
    expect(insight!.currency).toBe("USD");
  });

  it("does NOT flag services that merely share a category", () => {
    // The regression this rule exists for: Netflix and Spotify are both
    // "Entertainment" and overlap in nothing.
    const netflix = sub({ name: "Netflix" });
    const spotify = sub({ name: "Spotify" });
    expect(ofType([netflix, spotify], InsightType.SERVICE_OVERLAP)).toEqual([]);

    // Same shape, across other real pairings that used to be false positives.
    const notion = sub({ name: "Notion" });
    const todoist = sub({ name: "Todoist" });
    const onePassword = sub({ name: "1Password" });
    expect(
      ofType([notion, todoist, onePassword], InsightType.SERVICE_OVERLAP),
    ).toEqual([]);
  });

  it("stays silent on services it cannot identify", () => {
    const a = sub({ name: "Bob's Gym" });
    const b = sub({ name: "Local Newspaper" });
    expect(ofType([a, b], InsightType.SERVICE_OVERLAP)).toEqual([]);
  });

  it("counts a service once, so a duplicate is never also an overlap", () => {
    const cheap = sub({ name: "Netflix", amountMinor: 500 });
    const dear = sub({ name: "Netflix", amountMinor: 1549 });
    const disney = sub({ name: "Disney+", amountMinor: 1099 });
    const [overlap] = ofType(
      [cheap, dear, disney],
      InsightType.SERVICE_OVERLAP,
    );

    // Two distinct SERVICES, not three subscriptions.
    expect(overlap!.title).toBe("2 subscriptions for video streaming");
    expect(overlap!.subscriptionIds).toHaveLength(2);
    // The duplicate insight already claims the $5 row; the overlap must not
    // claim it a second time, or the recoverable total double-counts.
    expect(overlap!.subscriptionIds).toContain(cheap.id);
    expect(overlap!.subscriptionIds).not.toContain(dear.id);
  });

  it("collapses long name lists and uses 'all cover' for 3+", () => {
    const members = ["Netflix", "Disney+", "Hulu", "Max", "Peacock"].map(
      (name) => sub({ name }),
    );
    const [insight] = ofType(members, InsightType.SERVICE_OVERLAP);
    expect(insight!.title).toBe("5 subscriptions for video streaming");
    expect(insight!.body).toContain("Disney+, Hulu, Max, and 2 more all cover");
  });

  it("converts foreign-currency members for the savings figure", () => {
    // Two €10/mo subs → cheapest converts to $10.87/mo in the base currency.
    const a = sub({ name: "Netflix", currency: "EUR" });
    const b = sub({ name: "Disney+", currency: "EUR" });
    const [insight] = ofType([a, b], InsightType.SERVICE_OVERLAP);
    expect(insight!.savingsMinor).toBe(1087);
    expect(insight!.currency).toBe("USD");
    expect(insight!.body).toContain("$10.87");
  });

  it("normalizes mixed cadences to monthly equivalents for the savings figure", () => {
    // $120/yr = $10/mo — cheaper than the $15.49/mo sibling.
    const yearly = sub({
      name: "Disney+",
      amountMinor: 12000,
      interval: BillingInterval.YEAR,
    });
    const monthly = sub({ name: "Netflix", amountMinor: 1549 });
    const [insight] = ofType([yearly, monthly], InsightType.SERVICE_OVERLAP);
    expect(insight!.savingsMinor).toBe(1000);
  });

  it("separates purposes that share a category", () => {
    // AI Tools: two assistants overlap, image generation does not join them.
    const chatgpt = sub({ name: "ChatGPT Plus" });
    const claude = sub({ name: "Claude Pro" });
    const midjourney = sub({ name: "Midjourney" });
    const insights = ofType(
      [chatgpt, claude, midjourney],
      InsightType.SERVICE_OVERLAP,
    );
    expect(insights).toHaveLength(1);
    expect(insights[0]!.dedupeKey).toBe("overlap:AI_ASSISTANT");
    expect(insights[0]!.subscriptionIds).not.toContain(midjourney.id);
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
      sub({ name: "Netflix", amountMinor: 1549 }),
      sub({ name: "Disney+", amountMinor: 1099 }),
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
