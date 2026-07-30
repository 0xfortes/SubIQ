import { describe, expect, it } from "vitest";
import { BillingInterval, SubscriptionStatus } from "@/generated/prisma/enums";
import {
  categoryBreakdown,
  costLeaderboard,
  projectionByMonth,
  UNCATEGORIZED_ID,
  type AnalyticsSub,
} from "@/features/analytics/lib";

const DESIGN = { id: "cat-design", name: "Design", color: "#8B93FF" };
const MUSIC = { id: "cat-music", name: "Entertainment", color: "#F0708A" };

let seq = 0;
function sub(overrides: Partial<AnalyticsSub> = {}): AnalyticsSub {
  seq += 1;
  return {
    id: `sub-${seq}`,
    name: `Sub ${seq}`,
    color: null,
    amountMinor: 1000,
    currency: "USD",
    interval: BillingInterval.MONTH,
    intervalCount: 1,
    anchorDate: new Date(Date.UTC(2026, 0, 15)),
    status: SubscriptionStatus.ACTIVE,
    category: null,
    ...overrides,
  };
}

// Fixed reference: the user's zoned today is 2026-07-27, so the projection
// window is Aug 2026 – Jul 2027.
const TODAY = new Date(Date.UTC(2026, 6, 27));

describe("categoryBreakdown", () => {
  it("groups monthly equivalents by category, sorted descending", () => {
    const subs = [
      sub({ category: DESIGN, amountMinor: 1500 }),
      sub({ category: MUSIC, amountMinor: 1200 }),
      // Yearly $120 → $10/mo, joins Design.
      sub({
        category: DESIGN,
        amountMinor: 12000,
        interval: BillingInterval.YEAR,
      }),
    ];
    const slices = categoryBreakdown(subs, "USD");
    expect(slices.map((s) => s.id)).toEqual([DESIGN.id, MUSIC.id]);
    expect(slices[0]).toMatchObject({
      name: "Design",
      color: "#8B93FF",
      monthlyMinor: 2500,
      count: 2,
    });
    expect(slices[0]!.share).toBeCloseTo(2500 / 3700);
    expect(slices[1]!.share).toBeCloseTo(1200 / 3700);
  });

  it("buckets uncategorized subs with a null color", () => {
    const slices = categoryBreakdown([sub(), sub({ category: DESIGN })], "USD");
    const uncategorized = slices.find((s) => s.id === UNCATEGORIZED_ID);
    expect(uncategorized).toMatchObject({
      name: "Uncategorized",
      color: null,
      monthlyMinor: 1000,
    });
  });

  it("includes trials, excludes paused and cancelled", () => {
    const subs = [
      sub({ status: SubscriptionStatus.TRIAL, amountMinor: 500 }),
      sub({ status: SubscriptionStatus.PAUSED }),
      sub({ status: SubscriptionStatus.CANCELLED }),
    ];
    const slices = categoryBreakdown(subs, "USD");
    expect(slices).toHaveLength(1);
    expect(slices[0]).toMatchObject({ monthlyMinor: 500, count: 1, share: 1 });
  });

  it("converts foreign-currency subs into the base instead of excluding", () => {
    // €10/mo joins the $15/mo sub after conversion (~$10.87).
    const slices = categoryBreakdown(
      [
        sub({ category: DESIGN, amountMinor: 1500 }),
        sub({ category: DESIGN, currency: "EUR", amountMinor: 1000 }),
      ],
      "USD",
    );
    expect(slices).toHaveLength(1);
    expect(slices[0]!.count).toBe(2);
    expect(slices[0]!.monthlyMinor).toBe(1500 + 1087);
  });

  it("returns [] for empty input and never yields NaN shares", () => {
    expect(categoryBreakdown([], "USD")).toEqual([]);
    // Zero-amount sub: total is 0 → shares stay 0.
    const slices = categoryBreakdown([sub({ amountMinor: 0 })], "USD");
    expect(slices[0]!.share).toBe(0);
  });
});

describe("projectionByMonth", () => {
  it("returns exactly 12 buckets spanning the year boundary", () => {
    const buckets = projectionByMonth([], "USD", TODAY);
    expect(buckets).toHaveLength(12);
    expect(buckets[0]).toMatchObject({
      key: "2026-08",
      label: "Aug",
      longLabel: "Aug 2026",
      totalMinor: 0,
      count: 0,
    });
    expect(buckets[11]).toMatchObject({
      key: "2027-07",
      longLabel: "Jul 2027",
    });
  });

  it("charges a monthly sub once per bucket at the raw amount", () => {
    const buckets = projectionByMonth(
      [sub({ amountMinor: 1299 })],
      "USD",
      TODAY,
    );
    for (const bucket of buckets) {
      expect(bucket).toMatchObject({ totalMinor: 1299, count: 1 });
    }
  });

  it("lands a yearly sub in exactly one bucket", () => {
    const buckets = projectionByMonth(
      [
        sub({
          amountMinor: 11988,
          interval: BillingInterval.YEAR,
          anchorDate: new Date(Date.UTC(2026, 2, 10)),
        }),
      ],
      "USD",
      TODAY,
    );
    const charged = buckets.filter((b) => b.count > 0);
    expect(charged).toHaveLength(1);
    expect(charged[0]).toMatchObject({
      key: "2027-03",
      totalMinor: 11988,
      count: 1,
    });
  });

  it("charges a weekly sub 4-5 times per bucket", () => {
    const buckets = projectionByMonth(
      [sub({ amountMinor: 500, interval: BillingInterval.WEEK })],
      "USD",
      TODAY,
    );
    for (const bucket of buckets) {
      expect(bucket.count).toBeGreaterThanOrEqual(4);
      expect(bucket.count).toBeLessThanOrEqual(5);
      expect(bucket.totalMinor).toBe(bucket.count * 500);
    }
    const totalCharges = buckets.reduce((sum, b) => sum + b.count, 0);
    expect(totalCharges).toBeGreaterThanOrEqual(52);
  });

  it("clamps a Jan-31 monthly anchor into short months instead of dropping it", () => {
    const buckets = projectionByMonth(
      [sub({ anchorDate: new Date(Date.UTC(2026, 0, 31)) })],
      "USD",
      TODAY,
    );
    // Every month gets exactly one charge — Feb 2027 via the 28th.
    for (const bucket of buckets) expect(bucket.count).toBe(1);
    expect(buckets.find((b) => b.key === "2027-02")!.totalMinor).toBe(1000);
  });

  it("starts the window after the current month ends", () => {
    // Monthly on the 31st: charges Jul 31 2026 (current month → excluded)
    // and Aug 31 2026 (first bucket → included).
    const buckets = projectionByMonth(
      [sub({ anchorDate: new Date(Date.UTC(2026, 4, 31)) })],
      "USD",
      TODAY,
    );
    expect(buckets[0]).toMatchObject({ key: "2026-08", count: 1 });
    // A charge on the 1st of next month is included too.
    const firstOfMonth = projectionByMonth(
      [sub({ anchorDate: new Date(Date.UTC(2026, 7, 1)) })],
      "USD",
      TODAY,
    );
    expect(firstOfMonth[0]).toMatchObject({ key: "2026-08", count: 1 });
  });

  it("excludes non-billing subs but converts foreign-currency ones", () => {
    const paused = projectionByMonth(
      [sub({ status: SubscriptionStatus.PAUSED })],
      "USD",
      TODAY,
    );
    expect(paused.every((b) => b.count === 0)).toBe(true);
    // A foreign-currency billing sub is converted, not dropped.
    const withForeign = projectionByMonth(
      [sub({ currency: "EUR", amountMinor: 1000 })],
      "USD",
      TODAY,
    );
    expect(withForeign.every((b) => b.count === 1)).toBe(true);
    expect(withForeign[0]!.totalMinor).toBe(1087);
  });
});

describe("costLeaderboard", () => {
  it("ranks by monthly-equivalent cost, not raw price", () => {
    const subs = [
      // $120/yr = $10/mo — cheaper monthly despite the bigger price tag.
      sub({
        name: "Yearly",
        amountMinor: 12000,
        interval: BillingInterval.YEAR,
      }),
      sub({ name: "Monthly", amountMinor: 1299 }),
    ];
    const rows = costLeaderboard(subs, "USD");
    expect(rows.map((r) => r.name)).toEqual(["Monthly", "Yearly"]);
    expect(rows[0]).toMatchObject({ monthlyMinor: 1299, cycle: "/mo" });
    expect(rows[1]).toMatchObject({
      monthlyMinor: 1000,
      amountMinor: 12000,
      cycle: "/yr",
    });
    expect(rows[0]!.share).toBeCloseTo(1299 / 2299);
  });

  it("formats multi-count cycles and carries category info", () => {
    const rows = costLeaderboard(
      [
        sub({
          interval: BillingInterval.WEEK,
          intervalCount: 2,
          category: MUSIC,
        }),
      ],
      "USD",
    );
    expect(rows[0]).toMatchObject({
      cycle: "/2 wk",
      categoryName: "Entertainment",
      categoryColor: "#F0708A",
    });
  });

  it("excludes non-billing subs but includes foreign, converted; empty → []", () => {
    expect(costLeaderboard([], "USD")).toEqual([]);
    const rows = costLeaderboard(
      [
        sub({ currency: "EUR", amountMinor: 1000 }),
        sub({ status: SubscriptionStatus.CANCELLED }),
      ],
      "USD",
    );
    expect(rows).toHaveLength(1);
    // €10/mo → ~$10.87 in both the raw and monthly figures.
    expect(rows[0]).toMatchObject({
      amountMinor: 1087,
      currency: "USD",
      monthlyMinor: 1087,
    });
  });
});
