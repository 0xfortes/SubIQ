import { describe, expect, it } from "vitest";
import { BillingInterval } from "@/generated/prisma/enums";
import { computeNextRenewalAt } from "@/lib/recurrence";

const utc = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m - 1, d));

describe("computeNextRenewalAt", () => {
  describe("anchor in the future", () => {
    it("returns the anchor itself as the first renewal", () => {
      expect(
        computeNextRenewalAt(
          utc(2026, 9, 15),
          BillingInterval.MONTH,
          1,
          utc(2026, 7, 16),
        ),
      ).toEqual(utc(2026, 9, 15));
    });
  });

  describe("strictly-after semantics", () => {
    it("skips to the following occurrence when `from` is exactly on one", () => {
      expect(
        computeNextRenewalAt(
          utc(2026, 1, 15),
          BillingInterval.MONTH,
          1,
          utc(2026, 7, 15),
        ),
      ).toEqual(utc(2026, 8, 15));
    });

    it("returns today's occurrence when `from` is just before it", () => {
      const justBefore = new Date(Date.UTC(2026, 6, 14, 23, 59, 59));
      expect(
        computeNextRenewalAt(
          utc(2026, 1, 15),
          BillingInterval.MONTH,
          1,
          justBefore,
        ),
      ).toEqual(utc(2026, 7, 15));
    });
  });

  describe("MONTH", () => {
    it("advances a mid-month anchor without clamping", () => {
      expect(
        computeNextRenewalAt(
          utc(2026, 3, 10),
          BillingInterval.MONTH,
          1,
          utc(2026, 7, 16),
        ),
      ).toEqual(utc(2026, 8, 10));
    });

    it("clamps Jan 31 to Feb 28 in a non-leap year", () => {
      expect(
        computeNextRenewalAt(
          utc(2026, 1, 31),
          BillingInterval.MONTH,
          1,
          utc(2026, 2, 1),
        ),
      ).toEqual(utc(2026, 2, 28));
    });

    it("clamps Jan 31 to Feb 29 in a leap year", () => {
      expect(
        computeNextRenewalAt(
          utc(2028, 1, 31),
          BillingInterval.MONTH,
          1,
          utc(2028, 2, 1),
        ),
      ).toEqual(utc(2028, 2, 29));
    });

    it("recovers to the 31st after clamped months (no drift)", () => {
      // Anchor Jan 31 → after Feb 28 the March occurrence is the 31st again.
      expect(
        computeNextRenewalAt(
          utc(2026, 1, 31),
          BillingInterval.MONTH,
          1,
          utc(2026, 3, 1),
        ),
      ).toEqual(utc(2026, 3, 31));
      // …and April clamps to the 30th.
      expect(
        computeNextRenewalAt(
          utc(2026, 1, 31),
          BillingInterval.MONTH,
          1,
          utc(2026, 4, 1),
        ),
      ).toEqual(utc(2026, 4, 30));
    });

    it("handles intervalCount > 1 (quarterly)", () => {
      // Anchor Jan 31, every 3 months: Jan 31 → Apr 30 → Jul 31 → Oct 31.
      expect(
        computeNextRenewalAt(
          utc(2026, 1, 31),
          BillingInterval.MONTH,
          3,
          utc(2026, 5, 1),
        ),
      ).toEqual(utc(2026, 7, 31));
      expect(
        computeNextRenewalAt(
          utc(2026, 1, 31),
          BillingInterval.MONTH,
          3,
          utc(2026, 8, 1),
        ),
      ).toEqual(utc(2026, 10, 31));
    });

    it("crosses year boundaries", () => {
      expect(
        computeNextRenewalAt(
          utc(2025, 12, 15),
          BillingInterval.MONTH,
          1,
          utc(2025, 12, 20),
        ),
      ).toEqual(utc(2026, 1, 15));
    });

    it("handles anchors many years in the past", () => {
      expect(
        computeNextRenewalAt(
          utc(2019, 1, 31),
          BillingInterval.MONTH,
          1,
          utc(2026, 7, 16),
        ),
      ).toEqual(utc(2026, 7, 31));
    });
  });

  describe("YEAR", () => {
    it("advances to the next anniversary", () => {
      expect(
        computeNextRenewalAt(
          utc(2024, 5, 10),
          BillingInterval.YEAR,
          1,
          utc(2026, 7, 16),
        ),
      ).toEqual(utc(2027, 5, 10));
    });

    it("clamps a Feb 29 anchor to Feb 28 in non-leap years", () => {
      expect(
        computeNextRenewalAt(
          utc(2024, 2, 29),
          BillingInterval.YEAR,
          1,
          utc(2026, 7, 16),
        ),
      ).toEqual(utc(2027, 2, 28));
    });

    it("returns Feb 29 again on leap years (no drift)", () => {
      expect(
        computeNextRenewalAt(
          utc(2024, 2, 29),
          BillingInterval.YEAR,
          1,
          utc(2027, 3, 1),
        ),
      ).toEqual(utc(2028, 2, 29));
    });

    it("handles intervalCount > 1 (biennial)", () => {
      // Anchor 2024 → occurrences 2026, 2028…
      expect(
        computeNextRenewalAt(
          utc(2024, 3, 1),
          BillingInterval.YEAR,
          2,
          utc(2026, 7, 16),
        ),
      ).toEqual(utc(2028, 3, 1));
    });
  });

  describe("WEEK", () => {
    it("advances in exact 7-day periods", () => {
      // Anchor Wed Jul 1 2026; from Jul 16 → next is Jul 22.
      expect(
        computeNextRenewalAt(
          utc(2026, 7, 1),
          BillingInterval.WEEK,
          1,
          utc(2026, 7, 16),
        ),
      ).toEqual(utc(2026, 7, 22));
    });

    it("handles intervalCount > 1 (biweekly)", () => {
      // Anchor Jul 1, every 2 weeks: Jul 15, Jul 29…
      expect(
        computeNextRenewalAt(
          utc(2026, 7, 1),
          BillingInterval.WEEK,
          2,
          utc(2026, 7, 16),
        ),
      ).toEqual(utc(2026, 7, 29));
    });

    it("skips to the following week when `from` is exactly on an occurrence", () => {
      expect(
        computeNextRenewalAt(
          utc(2026, 7, 1),
          BillingInterval.WEEK,
          1,
          utc(2026, 7, 15),
        ),
      ).toEqual(utc(2026, 7, 22));
    });
  });

  describe("input handling", () => {
    it("normalizes anchor timestamps to UTC midnight", () => {
      const anchorWithTime = new Date(Date.UTC(2026, 0, 15, 17, 30));
      expect(
        computeNextRenewalAt(
          anchorWithTime,
          BillingInterval.MONTH,
          1,
          utc(2026, 7, 16),
        ),
      ).toEqual(utc(2026, 8, 15));
    });

    it("rejects invalid intervalCount", () => {
      expect(() =>
        computeNextRenewalAt(
          utc(2026, 1, 1),
          BillingInterval.MONTH,
          0,
          utc(2026, 7, 16),
        ),
      ).toThrow(/intervalCount/);
    });
  });
});
