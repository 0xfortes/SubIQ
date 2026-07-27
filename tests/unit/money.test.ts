import { describe, expect, it } from "vitest";
import { BillingInterval } from "@/generated/prisma/enums";
import {
  formatMoney,
  formatMoneyInput,
  monthlyEquivalentMinor,
  parseMoneyInput,
} from "@/lib/money";

describe("formatMoney", () => {
  it("formats two-decimal currencies from minor units", () => {
    expect(formatMoney(1299, "USD")).toBe("$12.99");
    expect(formatMoney(999999, "USD")).toBe("$9,999.99");
  });

  it("formats EUR with locale-specific symbols", () => {
    // en-US puts the symbol first; the value is what matters.
    expect(formatMoney(500, "EUR")).toBe("€5.00");
  });

  it("treats zero-decimal currencies as whole units", () => {
    expect(formatMoney(500, "JPY")).toBe("¥500");
  });

  it("formats zero and negative amounts", () => {
    expect(formatMoney(0, "USD")).toBe("$0.00");
    expect(formatMoney(-1299, "USD")).toBe("-$12.99");
  });

  it("respects the locale for grouping and symbol placement", () => {
    // Intl separates the symbol with a non-breaking space in de-DE.
    expect(formatMoney(123456, "EUR", "de-DE")).toBe("1.234,56\u00A0€");
  });

  it("rejects non-integer minor amounts", () => {
    expect(() => formatMoney(12.99, "USD")).toThrow(/integer/);
  });
});

describe("parseMoneyInput / formatMoneyInput", () => {
  it("parses decimal input to minor units without float math", () => {
    expect(parseMoneyInput("12.99", "USD")).toBe(1299);
    expect(parseMoneyInput("0.1", "USD")).toBe(10);
    expect(parseMoneyInput("1200", "USD")).toBe(120000);
  });

  it("accepts a comma decimal separator", () => {
    expect(parseMoneyInput("12,99", "USD")).toBe(1299);
  });

  it("handles zero-decimal currencies", () => {
    expect(parseMoneyInput("500", "JPY")).toBe(500);
    expect(parseMoneyInput("500.5", "JPY")).toBeNull();
  });

  it("rejects invalid input", () => {
    expect(parseMoneyInput("", "USD")).toBeNull();
    expect(parseMoneyInput("abc", "USD")).toBeNull();
    expect(parseMoneyInput("-5", "USD")).toBeNull();
    expect(parseMoneyInput("12.999", "USD")).toBeNull();
  });

  it("round-trips through formatMoneyInput", () => {
    expect(formatMoneyInput(1299, "USD")).toBe("12.99");
    expect(formatMoneyInput(1200, "USD")).toBe("12.00");
    expect(formatMoneyInput(500, "JPY")).toBe("500");
    expect(parseMoneyInput(formatMoneyInput(1005, "USD"), "USD")).toBe(1005);
  });
});

describe("monthlyEquivalentMinor", () => {
  it("returns monthly amounts unchanged", () => {
    expect(monthlyEquivalentMinor(1299, BillingInterval.MONTH, 1)).toBe(1299);
  });

  it("divides yearly amounts by 12", () => {
    expect(monthlyEquivalentMinor(12000, BillingInterval.YEAR, 1)).toBe(1000);
    // 9999 / 12 = 833.25 → 833
    expect(monthlyEquivalentMinor(9999, BillingInterval.YEAR, 1)).toBe(833);
  });

  it("scales weekly amounts by 52/12", () => {
    // 1000 * 52/12 = 4333.33… → 4333
    expect(monthlyEquivalentMinor(1000, BillingInterval.WEEK, 1)).toBe(4333);
  });

  it("divides by intervalCount (every-N billing)", () => {
    // Every 3 months at 3000 → 1000/month
    expect(monthlyEquivalentMinor(3000, BillingInterval.MONTH, 3)).toBe(1000);
    // Every 2 years at 48000 → 2000/month
    expect(monthlyEquivalentMinor(48000, BillingInterval.YEAR, 2)).toBe(2000);
    // Every 2 weeks at 1000 → 1000 * (52/12) / 2 = 2166.67 → 2167
    expect(monthlyEquivalentMinor(1000, BillingInterval.WEEK, 2)).toBe(2167);
  });

  it("rounds to the nearest integer minor unit", () => {
    // 100 / 12 = 8.33 → 8
    expect(monthlyEquivalentMinor(100, BillingInterval.YEAR, 1)).toBe(8);
    // 700 / 12 = 58.33 → 58; 750 / 12 = 62.5 → 63 (round half up)
    expect(monthlyEquivalentMinor(750, BillingInterval.YEAR, 1)).toBe(63);
  });

  it("rejects invalid inputs", () => {
    expect(() =>
      monthlyEquivalentMinor(12.5, BillingInterval.MONTH, 1),
    ).toThrow(/integer/);
    expect(() =>
      monthlyEquivalentMinor(1000, BillingInterval.MONTH, 0),
    ).toThrow(/intervalCount/);
    expect(() =>
      monthlyEquivalentMinor(1000, BillingInterval.MONTH, 1.5),
    ).toThrow(/intervalCount/);
  });
});
