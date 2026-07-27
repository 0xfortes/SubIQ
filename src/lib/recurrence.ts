import { BillingInterval } from "@/generated/prisma/enums";

/**
 * Recurrence math — the heart of the product. All date math is UTC;
 * user timezones apply only at the presentation layer.
 *
 * Model: interval (WEEK|MONTH|YEAR) × intervalCount, anchored at anchorDate.
 * Occurrence k is derived from the ANCHOR every time (never from the
 * previous occurrence), so month-end clamping cannot drift:
 * anchor Jan 31 → Feb 28 (29 in leap years) → Mar 31 → Apr 30 → May 31.
 *
 * Renewal instants are UTC midnight of the renewal day (anchorDate is a
 * calendar date column).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function daysInMonth(year: number, monthIndex: number): number {
  // Day 0 of the following month = last day of `monthIndex`.
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** UTC midnight of the given date. */
function toUtcMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * The anchor's calendar day stepped forward by `months`, clamped to the
 * target month's length (Jan 31 + 1 → Feb 28/29).
 */
function addMonthsClamped(anchor: Date, months: number): Date {
  const totalMonths = anchor.getUTCMonth() + months;
  const year = anchor.getUTCFullYear() + Math.floor(totalMonths / 12);
  const month = ((totalMonths % 12) + 12) % 12;
  const day = Math.min(anchor.getUTCDate(), daysInMonth(year, month));
  return new Date(Date.UTC(year, month, day));
}

/**
 * Compute the next renewal instant strictly after `from`.
 *
 * - Anchor in the future → the anchor itself is the next renewal.
 * - `from` exactly on an occurrence → the following occurrence.
 */
export function computeNextRenewalAt(
  anchorDate: Date,
  interval: BillingInterval,
  intervalCount: number,
  from: Date,
): Date {
  if (!Number.isInteger(intervalCount) || intervalCount < 1) {
    throw new Error(
      `intervalCount must be a positive integer, got ${intervalCount}`,
    );
  }

  const anchor = toUtcMidnight(anchorDate);
  if (anchor.getTime() > from.getTime()) {
    return anchor;
  }

  if (interval === BillingInterval.WEEK) {
    const periodMs = 7 * intervalCount * DAY_MS;
    const elapsed = from.getTime() - anchor.getTime();
    const k = Math.floor(elapsed / periodMs) + 1;
    return new Date(anchor.getTime() + k * periodMs);
  }

  const monthsPerStep =
    interval === BillingInterval.YEAR ? 12 * intervalCount : intervalCount;
  return nextMonthlyOccurrence(anchor, monthsPerStep, from);
}

function nextMonthlyOccurrence(
  anchor: Date,
  monthsPerStep: number,
  from: Date,
): Date {
  // Estimate the step from the calendar month distance, then walk to the
  // first occurrence strictly after `from` (adjustment is at most ±1 step).
  const monthDistance =
    (from.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
    (from.getUTCMonth() - anchor.getUTCMonth());
  let k = Math.max(0, Math.floor(monthDistance / monthsPerStep) - 1);
  let occurrence = addMonthsClamped(anchor, k * monthsPerStep);
  while (occurrence.getTime() <= from.getTime()) {
    k += 1;
    occurrence = addMonthsClamped(anchor, k * monthsPerStep);
  }
  return occurrence;
}

const CYCLE_UNIT_SHORT: Record<BillingInterval, string> = {
  [BillingInterval.WEEK]: "wk",
  [BillingInterval.MONTH]: "mo",
  [BillingInterval.YEAR]: "yr",
};

/** "/mo", "/yr", "/2 wk" — the faint suffix after mono cost figures. */
export function cycleSuffix(
  interval: BillingInterval,
  intervalCount: number,
): string {
  const unit = CYCLE_UNIT_SHORT[interval];
  return intervalCount === 1 ? `/${unit}` : `/${intervalCount} ${unit}`;
}

/**
 * Every renewal instant in the window (from, to] — e.g. a weekly
 * subscription contributes 4–5 occurrences to a 30-day Renewal Ruler.
 */
export function renewalOccurrencesBetween(
  anchorDate: Date,
  interval: BillingInterval,
  intervalCount: number,
  from: Date,
  to: Date,
): Date[] {
  const occurrences: Date[] = [];
  let cursor = from;
  for (;;) {
    const next = computeNextRenewalAt(
      anchorDate,
      interval,
      intervalCount,
      cursor,
    );
    if (next.getTime() > to.getTime()) break;
    occurrences.push(next);
    cursor = next;
  }
  return occurrences;
}
