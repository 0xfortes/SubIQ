/**
 * Renewal timeline data shaping — pure, no React, exhaustively testable.
 *
 * The "Next 30 days" module has two synchronized views over the same items:
 *   - a spatial BAND: renewals grouped by day into nodes along a 0..30 axis
 *     (`groupRenewalsByDay`);
 *   - an AGENDA list: the soonest renewal pulled out as "up next", the rest
 *     bucketed into this week / next week / later (`bucketRenewals`).
 * Both consume the same window-filtered, day-then-amount ordering.
 */

export const RULER_DAYS = 30;
/** Bucket boundaries (inclusive upper bound, in whole days from today). */
export const THIS_WEEK_MAX = 7;
export const NEXT_WEEK_MAX = 14;

export interface RulerItem {
  id: string;
  /** Whole days from today, 0..RULER_DAYS. */
  day: number;
  amountMinor: number;
  currency: string;
  name: string;
  /** Brand hue for styling, if the service has one. */
  color?: string | null;
  /** Presentation cycle suffix ("/mo") for detail rows. */
  cycle?: string;
  /** Category name for the agenda meta line, if any. */
  category?: string | null;
}

export interface DayGroup {
  day: number;
  /** 0..1 fraction along the track. */
  position: number;
  /** Items on this day, largest amount first. */
  items: RulerItem[];
  totalMinor: number;
  currency: string;
}

export interface RenewalBuckets {
  /** The single soonest renewal (largest amount breaks a same-day tie). */
  upNext: RulerItem | null;
  /** day 0..7, excluding `upNext`. */
  thisWeek: RulerItem[];
  /** day 8..14. */
  nextWeek: RulerItem[];
  /** day 15..30. */
  later: RulerItem[];
}

function inWindow(item: RulerItem): boolean {
  return item.day >= 0 && item.day <= RULER_DAYS;
}

/** Window-filtered items ordered by soonest, then largest amount. */
export function sortRenewals(items: RulerItem[]): RulerItem[] {
  return items
    .filter(inWindow)
    .sort((a, b) => a.day - b.day || b.amountMinor - a.amountMinor);
}

/** One node per day (same-day renewals merged), ordered by day. */
export function groupRenewalsByDay(items: RulerItem[]): DayGroup[] {
  const byDay = new Map<number, RulerItem[]>();
  for (const item of items) {
    if (!inWindow(item)) continue;
    const bucket = byDay.get(item.day) ?? [];
    bucket.push(item);
    byDay.set(item.day, bucket);
  }

  return [...byDay.keys()]
    .sort((a, b) => a - b)
    .map((day) => {
      const dayItems = byDay
        .get(day)!
        .sort((a, b) => b.amountMinor - a.amountMinor);
      return {
        day,
        position: day / RULER_DAYS,
        items: dayItems,
        totalMinor: dayItems.reduce((sum, item) => sum + item.amountMinor, 0),
        currency: dayItems[0]?.currency ?? "USD",
      };
    });
}

/** Pull out the soonest renewal, bucket the rest by time window. */
export function bucketRenewals(items: RulerItem[]): RenewalBuckets {
  const [upNext, ...rest] = sortRenewals(items);
  return {
    upNext: upNext ?? null,
    thisWeek: rest.filter((item) => item.day <= THIS_WEEK_MAX),
    nextWeek: rest.filter(
      (item) => item.day > THIS_WEEK_MAX && item.day <= NEXT_WEEK_MAX,
    ),
    later: rest.filter((item) => item.day > NEXT_WEEK_MAX),
  };
}
