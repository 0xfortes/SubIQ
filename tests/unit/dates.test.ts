import { describe, expect, it } from "vitest";
import {
  daysUntil,
  formatDay,
  isValidTimeZone,
  listTimeZones,
  todayInZone,
  zonedYMD,
} from "@/lib/dates";

describe("zonedYMD", () => {
  it("returns the calendar day as seen in the zone", () => {
    const instant = new Date("2026-07-27T02:00:00Z");
    expect(zonedYMD(instant, "UTC")).toEqual({ y: 2026, m: 7, d: 27 });
    // 02:00 UTC is still the previous evening in New York (UTC-4 in July).
    expect(zonedYMD(instant, "America/New_York")).toEqual({
      y: 2026,
      m: 7,
      d: 26,
    });
    // …and already the same day's morning in Tokyo (UTC+9).
    expect(zonedYMD(instant, "Asia/Tokyo")).toEqual({ y: 2026, m: 7, d: 27 });
  });
});

describe("todayInZone", () => {
  it("is identity for UTC", () => {
    const now = new Date("2026-07-27T15:30:00Z");
    expect(todayInZone("UTC", now).toISOString()).toBe(
      "2026-07-27T00:00:00.000Z",
    );
  });

  it("stays on the previous day west of UTC before local midnight", () => {
    const now = new Date("2026-07-27T02:00:00Z");
    expect(todayInZone("America/New_York", now).toISOString()).toBe(
      "2026-07-26T00:00:00.000Z",
    );
  });

  it("rolls to the next day east of UTC after local midnight", () => {
    const now = new Date("2026-07-26T16:00:00Z");
    expect(todayInZone("Asia/Tokyo", now).toISOString()).toBe(
      "2026-07-27T00:00:00.000Z",
    );
  });

  it("returns exact UTC midnights across DST transitions", () => {
    // Spring forward: 2026-03-08 06:59 UTC = 01:59 EST, still Mar 8 locally.
    expect(
      todayInZone("America/New_York", new Date("2026-03-08T06:59:00Z")),
    ).toEqual(new Date("2026-03-08T00:00:00.000Z"));
    // Fall back: 2026-11-01 05:30 UTC = 01:30 EDT/EST (ambiguous hour).
    expect(
      todayInZone("America/New_York", new Date("2026-11-01T05:30:00Z")),
    ).toEqual(new Date("2026-11-01T00:00:00.000Z"));
  });
});

describe("daysUntil with a zoned today", () => {
  it("counts renewal days from the user's local today, not UTC's", () => {
    // Renewal calendar day Jul 27; it is 01:00 UTC on Jul 27, but still
    // the evening of Jul 26 in New York.
    const renewal = new Date("2026-07-27T00:00:00Z");
    const now = new Date("2026-07-27T01:00:00Z");
    expect(daysUntil(renewal, now)).toBe(0);
    expect(daysUntil(renewal, todayInZone("America/New_York", now))).toBe(1);
  });
});

describe("formatDay", () => {
  it("defaults to UTC (calendar dates must never shift)", () => {
    const renewal = new Date("2026-07-27T00:00:00Z");
    expect(formatDay(renewal, new Date("2026-07-01T00:00:00Z"))).toBe("Jul 27");
  });

  it("formats instants in the requested zone", () => {
    const instant = new Date("2026-07-27T03:30:00Z");
    const reference = new Date("2026-07-27T03:30:00Z");
    expect(formatDay(instant, reference, "UTC")).toBe("Jul 27");
    expect(formatDay(instant, reference, "America/New_York")).toBe("Jul 26");
  });

  it("compares years in the requested zone at the year boundary", () => {
    const instant = new Date("2027-01-01T02:00:00Z");
    const reference = new Date("2026-12-31T20:00:00Z");
    // In New York both moments are still Dec 31, 2026 — same year, short form.
    expect(formatDay(instant, reference, "America/New_York")).toBe("Dec 31");
    // In UTC the instant is already next year.
    expect(formatDay(instant, reference, "UTC")).toBe("Jan 1, 2027");
  });

  it("shows the year for a renewal next year relative to a zoned today", () => {
    const renewal = new Date("2027-01-05T00:00:00Z");
    expect(
      formatDay(renewal, todayInZone("UTC", new Date("2026-12-30T12:00:00Z"))),
    ).toBe("Jan 5, 2027");
  });
});

describe("isValidTimeZone", () => {
  it("accepts canonical zones and aliases", () => {
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("Asia/Calcutta")).toBe(true);
  });

  it("rejects garbage", () => {
    expect(isValidTimeZone("America/Not_A_City")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone("not a zone")).toBe(false);
  });
});

describe("listTimeZones", () => {
  it("includes UTC and common zones", () => {
    const zones = listTimeZones();
    expect(zones).toContain("UTC");
    expect(zones).toContain("Europe/Lisbon");
  });
});
