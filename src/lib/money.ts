import { BillingInterval } from "@/generated/prisma/enums";
import { USD_RATES, type RateCurrency } from "@/lib/exchange-rates";

/**
 * All money handling lives here. Amounts are integer minor units (cents)
 * with an ISO 4217 currency code — never floats, never Decimal math in JS.
 * Cross-currency conversion (convertMinor) and monthly normalization
 * (monthlyEquivalentMinor / ...InBaseMinor) both live here so aggregation
 * math has exactly one home.
 */

/** Currencies offered in workspace settings and the subscription form. */
export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
] as const;

// Average weeks per month over a year: 52 weeks / 12 months.
const WEEKS_PER_MONTH = 52 / 12;

const MONTHLY_FACTOR: Record<BillingInterval, number> = {
  [BillingInterval.WEEK]: WEEKS_PER_MONTH,
  [BillingInterval.MONTH]: 1,
  [BillingInterval.YEAR]: 1 / 12,
};

function fractionDigits(currency: string, locale: string): number {
  return (
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}

/**
 * The currency's own symbol ("$", "€", "¥", "CHF"). For amount ENTRY, where
 * the figure is typed by the user and the symbol sits beside the field as a
 * static prefix — display amounts always go through formatMoney instead.
 * Falls back to the code itself if the runtime has no symbol for it.
 */
export function currencySymbol(currency: string, locale = "en-US"): string {
  const part = new Intl.NumberFormat(locale, { style: "currency", currency })
    .formatToParts(0)
    .find((p) => p.type === "currency");
  return part?.value ?? currency;
}

/**
 * Format a minor-unit amount for display. Handles zero-decimal currencies
 * (JPY: 500 minor units = ¥500) via the currency's own fraction digits.
 */
export function formatMoney(
  amountMinor: number,
  currency: string,
  locale = "en-US",
  options?: { whole?: boolean },
): string {
  if (!Number.isInteger(amountMinor)) {
    throw new Error(`amountMinor must be an integer, got ${amountMinor}`);
  }
  const digits = fractionDigits(currency, locale);
  const amountMajor = amountMinor / 10 ** digits;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    // whole: axis ticks and dense figures drop cents ("$129").
    ...(options?.whole ? { maximumFractionDigits: 0 } : {}),
  }).format(amountMajor);
}

/**
 * Parse a user-typed major-unit amount ("12.99", "12,99", "1200") into
 * integer minor units for the currency — pure string/integer math, no
 * floats. Returns null for anything invalid (too many decimals, negative,
 * not a number).
 */
export function parseMoneyInput(
  value: string,
  currency: string,
  locale = "en-US",
): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;

  const digits = fractionDigits(currency, locale);
  const [wholePart = "0", fractionPart = ""] = normalized.split(".");
  if (fractionPart.length > digits) return null;

  const minor =
    parseInt(wholePart, 10) * 10 ** digits +
    (fractionPart ? parseInt(fractionPart.padEnd(digits, "0"), 10) : 0);
  return Number.isSafeInteger(minor) ? minor : null;
}

/**
 * Minor units back to a plain editable string ("1299" → "12.99") for
 * pre-filling form inputs. Locale-independent (always "." separator).
 */
export function formatMoneyInput(
  amountMinor: number,
  currency: string,
): string {
  const digits = fractionDigits(currency, "en-US");
  if (digits === 0) return String(amountMinor);
  const whole = Math.trunc(amountMinor / 10 ** digits);
  const fraction = Math.abs(amountMinor % 10 ** digits)
    .toString()
    .padStart(digits, "0");
  return `${whole}.${fraction}`;
}

/**
 * Normalize any billing cadence to a monthly-equivalent amount in minor
 * units. THE single place monthly-equivalent math happens — KPIs, category
 * totals, and savings insights all call this.
 *
 * Policy: (amount / intervalCount) × interval factor, rounded to the
 * nearest integer minor unit (WEEK ×52/12, MONTH ×1, YEAR ÷12).
 */
export function monthlyEquivalentMinor(
  amountMinor: number,
  interval: BillingInterval,
  intervalCount: number,
): number {
  if (!Number.isInteger(amountMinor)) {
    throw new Error(`amountMinor must be an integer, got ${amountMinor}`);
  }
  if (!Number.isInteger(intervalCount) || intervalCount < 1) {
    throw new Error(
      `intervalCount must be a positive integer, got ${intervalCount}`,
    );
  }
  return Math.round((amountMinor * MONTHLY_FACTOR[interval]) / intervalCount);
}

/**
 * Convert a minor-unit amount from one currency to another using the static
 * USD-anchored rate table. Goes through major units so currencies with
 * different minor-unit exponents (USD cents ↔ JPY whole yen) convert
 * correctly, then rounds back to the target's minor units.
 *
 * Same-currency is an exact identity; an unknown currency (not in the rate
 * table) falls back to identity rather than producing NaN.
 */
export function convertMinor(
  amountMinor: number,
  from: string,
  to: string,
): number {
  if (!Number.isInteger(amountMinor)) {
    throw new Error(`amountMinor must be an integer, got ${amountMinor}`);
  }
  if (from === to) return amountMinor;
  const rateFrom = USD_RATES[from as RateCurrency];
  const rateTo = USD_RATES[to as RateCurrency];
  if (rateFrom === undefined || rateTo === undefined) return amountMinor;

  const fromMajor = amountMinor / 10 ** fractionDigits(from, "en-US");
  const toMajor = (fromMajor * rateTo) / rateFrom;
  return Math.round(toMajor * 10 ** fractionDigits(to, "en-US"));
}

/**
 * A subscription's monthly-equivalent spend expressed in the workspace base
 * currency: convert the charge into the base, then normalize the cadence.
 * THE one place aggregations turn a foreign-currency subscription into a
 * comparable base-currency monthly figure.
 */
export function monthlyEquivalentInBaseMinor(
  sub: {
    amountMinor: number;
    currency: string;
    interval: BillingInterval;
    intervalCount: number;
  },
  base: string,
): number {
  return monthlyEquivalentMinor(
    convertMinor(sub.amountMinor, sub.currency, base),
    sub.interval,
    sub.intervalCount,
  );
}
