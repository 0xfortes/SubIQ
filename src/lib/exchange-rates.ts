/**
 * Static exchange rates: units of each currency per 1 USD.
 *
 * Approximate mid-market rates (manually maintained, ~2026-07). This is the
 * single source of FX truth — every conversion goes through `convertMinor` in
 * `lib/money.ts`, so swapping this table for a live feed (or a DB-backed rate
 * table refreshed by the nightly cron) later is a one-file change with no
 * call-site churn.
 *
 * Keep every `SUPPORTED_CURRENCIES` entry present, or `convertMinor` falls back
 * to identity (no conversion) for the missing one.
 */
export const USD_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.51,
  JPY: 151,
  CHF: 0.88,
} as const;

export type RateCurrency = keyof typeof USD_RATES;
