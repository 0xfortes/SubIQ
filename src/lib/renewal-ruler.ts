/**
 * Renewal Ruler layout — pure geometry, no React, exhaustively testable.
 *
 * Input: renewal items placed on a 0..RULER_DAYS day axis. Output: markers
 * (same-day items grouped) with a lane assignment such that flags can
 * never overlap, by construction:
 *   sort markers by day; each flag joins the lowest lane whose previous
 *   flag is ≥ MIN_GAP (fraction of track width) to its left, else a new
 *   lane opens. Lane index sets stem height; track height grows with the
 *   lane count.
 */

export const RULER_DAYS = 30;
/** Minimum horizontal gap between flags sharing a lane (13% of width). */
export const MIN_GAP = 0.13;
/** Flags beyond this position flip to extend leftward so they never clip. */
export const FLIP_THRESHOLD = 0.86;
/** Same-day pileups above this collapse into one stacked count marker. */
export const STACK_LIMIT = 3;
export const STEM_BASE_PX = 24;
export const STEM_PER_LANE_PX = 26;

export interface RulerItem {
  id: string;
  /** Whole days from today, 0..RULER_DAYS. */
  day: number;
  amountMinor: number;
  currency: string;
  name: string;
  /** Brand hue for hover styling, if the service has one. */
  color?: string | null;
  /** Presentation cycle suffix ("/mo") for tooltips. */
  cycle?: string;
}

export interface RulerMarker {
  day: number;
  /** 0..1 fraction along the track. */
  position: number;
  lane: number;
  stemPx: number;
  /** Flag extends leftward to avoid clipping the track edge. */
  flipped: boolean;
  /** >STACK_LIMIT same-day items collapse; flag shows count + total. */
  stacked: boolean;
  totalMinor: number;
  currency: string;
  items: RulerItem[];
}

export interface RulerLayout {
  markers: RulerMarker[];
  laneCount: number;
  trackHeightPx: number;
}

export function layoutRuler(items: RulerItem[]): RulerLayout {
  const byDay = new Map<number, RulerItem[]>();
  for (const item of items) {
    if (item.day < 0 || item.day > RULER_DAYS) continue;
    const bucket = byDay.get(item.day) ?? [];
    bucket.push(item);
    byDay.set(item.day, bucket);
  }

  const days = [...byDay.keys()].sort((a, b) => a - b);
  const laneLastPosition: number[] = [];
  const markers: RulerMarker[] = [];

  for (const day of days) {
    const dayItems = byDay
      .get(day)!
      .sort((a, b) => b.amountMinor - a.amountMinor);
    const position = day / RULER_DAYS;

    const groups: RulerItem[][] =
      dayItems.length > STACK_LIMIT
        ? [dayItems]
        : dayItems.map((item) => [item]);

    for (const group of groups) {
      let lane = laneLastPosition.findIndex(
        (last) => position - last >= MIN_GAP,
      );
      if (lane === -1) {
        lane = laneLastPosition.length;
        laneLastPosition.push(position);
      } else {
        laneLastPosition[lane] = position;
      }

      markers.push({
        day,
        position,
        lane,
        stemPx: STEM_BASE_PX + lane * STEM_PER_LANE_PX,
        flipped: position > FLIP_THRESHOLD,
        stacked: group.length > 1,
        totalMinor: group.reduce((sum, item) => sum + item.amountMinor, 0),
        currency: group[0]?.currency ?? "USD",
        items: group,
      });
    }
  }

  const laneCount = laneLastPosition.length;
  return {
    markers,
    laneCount,
    trackHeightPx:
      STEM_BASE_PX + Math.max(0, laneCount - 1) * STEM_PER_LANE_PX + 34,
  };
}
