/**
 * Date presentation helpers. Storage is always UTC.
 *
 * Two kinds of dates flow through the app — do not mix them up:
 *
 * - CALENDAR DATES (anchorDate, nextRenewalAt, renewal occurrences): a day
 *   encoded as UTC midnight. Always format these with the default "UTC"
 *   zone — passing a user timezone would shift the displayed day for anyone
 *   west of UTC. The profile timezone only moves the *"today" reference*
 *   (use `todayInZone` for `daysUntil`/`formatDay` references).
 * - INSTANTS (createdAt-style timestamps): real moments in time. These may
 *   be formatted with the user's timezone via `formatDay(date, ref, tz)`.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

interface DayFormatters {
  sameYear: Intl.DateTimeFormat;
  otherYear: Intl.DateTimeFormat;
}

const dayFormatters = new Map<string, DayFormatters>();

function formattersFor(timeZone: string): DayFormatters {
  let cached = dayFormatters.get(timeZone);
  if (!cached) {
    cached = {
      sameYear: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        timeZone,
      }),
      otherYear: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone,
      }),
    };
    dayFormatters.set(timeZone, cached);
  }
  return cached;
}

const ymdFormatters = new Map<string, Intl.DateTimeFormat>();

function ymdFormatterFor(timeZone: string): Intl.DateTimeFormat {
  let cached = ymdFormatters.get(timeZone);
  if (!cached) {
    // en-CA formats as YYYY-MM-DD, which parses without formatToParts.
    cached = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    });
    ymdFormatters.set(timeZone, cached);
  }
  return cached;
}

/** Year/month/day (month 1-based) of an instant as seen in an IANA zone. */
export function zonedYMD(
  date: Date,
  timeZone: string,
): { y: number; m: number; d: number } {
  const [y, m, d] = ymdFormatterFor(timeZone).format(date).split("-");
  return { y: Number(y), m: Number(m), d: Number(d) };
}

/**
 * The zone's current calendar day, encoded as UTC midnight — the tz-aware
 * "today" to use as the reference for `daysUntil` and `formatDay`.
 */
export function todayInZone(timeZone: string, now = new Date()): Date {
  const { y, m, d } = zonedYMD(now, timeZone);
  return new Date(Date.UTC(y, m - 1, d));
}

/** true if the string is an IANA timezone this runtime accepts. */
export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** IANA zones for settings dropdowns; falls back to just UTC if the runtime
 * lacks `Intl.supportedValuesOf`. */
export function listTimeZones(): string[] {
  if (typeof Intl.supportedValuesOf !== "function") return ["UTC"];
  const zones = Intl.supportedValuesOf("timeZone");
  return zones.includes("UTC") ? zones : ["UTC", ...zones];
}

/** "Jul 27" this year, "Jul 27, 2027" otherwise — as seen in `timeZone`.
 * Keep the default "UTC" for calendar dates (see module header). */
export function formatDay(
  date: Date,
  reference = new Date(),
  timeZone = "UTC",
): string {
  const { sameYear, otherYear } = formattersFor(timeZone);
  return zonedYMD(date, timeZone).y === zonedYMD(reference, timeZone).y
    ? sameYear.format(date)
    : otherYear.format(date);
}

/** Whole days from `from` (UTC midnight-normalized) until `date`. */
export function daysUntil(date: Date, from = new Date()): number {
  const fromMidnight = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
  );
  return Math.round((date.getTime() - fromMidnight) / DAY_MS);
}
