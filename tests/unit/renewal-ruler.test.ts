import { describe, expect, it } from "vitest";
import {
  bucketRenewals,
  groupRenewalsByDay,
  RULER_DAYS,
  sortRenewals,
  type RulerItem,
} from "@/lib/renewal-ruler";

function item(overrides: Partial<RulerItem> & { day: number }): RulerItem {
  return {
    id: `${overrides.day}-${Math.random()}`,
    amountMinor: 1000,
    currency: "USD",
    name: "Service",
    ...overrides,
  };
}

describe("sortRenewals", () => {
  it("orders by soonest day, then largest amount", () => {
    const sorted = sortRenewals([
      item({ day: 5, name: "B", amountMinor: 100 }),
      item({ day: 2, name: "A" }),
      item({ day: 5, name: "C", amountMinor: 9000 }),
    ]);
    expect(sorted.map((i) => i.name)).toEqual(["A", "C", "B"]);
  });

  it("drops items outside the 0..30 window", () => {
    expect(sortRenewals([item({ day: -1 }), item({ day: 31 })])).toEqual([]);
    expect(
      sortRenewals([item({ day: 0 }), item({ day: RULER_DAYS })]),
    ).toHaveLength(2);
  });
});

describe("groupRenewalsByDay", () => {
  it("returns an empty array for no items", () => {
    expect(groupRenewalsByDay([])).toEqual([]);
  });

  it("merges same-day renewals into one node with a summed total", () => {
    const groups = groupRenewalsByDay([
      item({ day: 7, name: "A", amountMinor: 500 }),
      item({ day: 7, name: "B", amountMinor: 1500 }),
      item({ day: 3, name: "C", amountMinor: 200 }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.day).toBe(3);
    const seven = groups[1]!;
    expect(seven.items.map((i) => i.name)).toEqual(["B", "A"]); // amount desc
    expect(seven.totalMinor).toBe(2000);
  });

  it("positions nodes as a 0..1 fraction of the axis", () => {
    const groups = groupRenewalsByDay([
      item({ day: 0 }),
      item({ day: 15 }),
      item({ day: 30 }),
    ]);
    expect(groups.map((g) => g.position)).toEqual([0, 0.5, 1]);
  });
});

describe("bucketRenewals", () => {
  it("returns nulls/empties for no items", () => {
    expect(bucketRenewals([])).toEqual({
      upNext: null,
      thisWeek: [],
      nextWeek: [],
      later: [],
    });
  });

  it("pulls out the soonest as up-next and buckets the rest by window", () => {
    const buckets = bucketRenewals([
      item({ day: 2, name: "UpNext" }),
      item({ day: 6, name: "ThisWeek" }),
      item({ day: 10, name: "NextWeek" }),
      item({ day: 25, name: "Later" }),
    ]);
    expect(buckets.upNext?.name).toBe("UpNext");
    expect(buckets.thisWeek.map((i) => i.name)).toEqual(["ThisWeek"]);
    expect(buckets.nextWeek.map((i) => i.name)).toEqual(["NextWeek"]);
    expect(buckets.later.map((i) => i.name)).toEqual(["Later"]);
  });

  it("keeps a same-day runner-up in this-week rather than as up-next", () => {
    const buckets = bucketRenewals([
      item({ day: 3, name: "Small", amountMinor: 100 }),
      item({ day: 3, name: "Big", amountMinor: 9000 }),
    ]);
    expect(buckets.upNext?.name).toBe("Big");
    expect(buckets.thisWeek.map((i) => i.name)).toEqual(["Small"]);
  });

  it("honors the 7/14 day boundaries exactly", () => {
    const buckets = bucketRenewals([
      item({ day: 0, name: "up" }),
      item({ day: 7, name: "stillThisWeek" }),
      item({ day: 8, name: "nextWeekStart" }),
      item({ day: 14, name: "stillNextWeek" }),
      item({ day: 15, name: "laterStart" }),
    ]);
    expect(buckets.thisWeek.map((i) => i.name)).toEqual(["stillThisWeek"]);
    expect(buckets.nextWeek.map((i) => i.name)).toEqual([
      "nextWeekStart",
      "stillNextWeek",
    ]);
    expect(buckets.later.map((i) => i.name)).toEqual(["laterStart"]);
  });
});
