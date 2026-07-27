import { describe, expect, it } from "vitest";
import {
  FLIP_THRESHOLD,
  layoutRuler,
  MIN_GAP,
  RULER_DAYS,
  STACK_LIMIT,
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

describe("layoutRuler", () => {
  it("returns an empty layout for no items", () => {
    const layout = layoutRuler([]);
    expect(layout.markers).toEqual([]);
    expect(layout.laneCount).toBe(0);
  });

  it("keeps well-spaced items in a single lane", () => {
    const layout = layoutRuler([
      item({ day: 0 }),
      item({ day: 10 }),
      item({ day: 20 }),
      item({ day: 30 }),
    ]);
    expect(layout.laneCount).toBe(1);
    expect(layout.markers.every((m) => m.lane === 0)).toBe(true);
  });

  it("opens a new lane when flags are closer than MIN_GAP", () => {
    // Days 1 and 2 are 1/30 apart — far below MIN_GAP.
    const layout = layoutRuler([item({ day: 1 }), item({ day: 2 })]);
    expect(layout.laneCount).toBe(2);
    expect(layout.markers.map((m) => m.lane)).toEqual([0, 1]);
  });

  it("reuses a lane once the gap is respected", () => {
    const dayGap = Math.ceil(MIN_GAP * RULER_DAYS); // first spacing that fits
    const layout = layoutRuler([
      item({ day: 0 }),
      item({ day: 1 }),
      item({ day: dayGap }),
    ]);
    // Third flag is ≥ MIN_GAP from the first → rejoins lane 0.
    expect(layout.markers[2]?.lane).toBe(0);
    expect(layout.laneCount).toBe(2);
  });

  it("never lets two flags in one lane violate MIN_GAP (dense cluster)", () => {
    const layout = layoutRuler(
      Array.from({ length: 12 }, (_, i) => item({ day: i * 2 })),
    );
    const byLane = new Map<number, number[]>();
    for (const marker of layout.markers) {
      const positions = byLane.get(marker.lane) ?? [];
      positions.push(marker.position);
      byLane.set(marker.lane, positions);
    }
    for (const positions of byLane.values()) {
      for (let i = 1; i < positions.length; i++) {
        expect(positions[i]! - positions[i - 1]!).toBeGreaterThanOrEqual(
          MIN_GAP - 1e-9,
        );
      }
    }
  });

  it("gives same-day items distinct lanes when below the stack limit", () => {
    const layout = layoutRuler([
      item({ day: 5, name: "A" }),
      item({ day: 5, name: "B" }),
    ]);
    expect(layout.markers).toHaveLength(2);
    expect(new Set(layout.markers.map((m) => m.lane)).size).toBe(2);
  });

  it("collapses same-day pileups above the stack limit into one marker", () => {
    const items = Array.from({ length: STACK_LIMIT + 1 }, (_, i) =>
      item({ day: 7, name: `S${i}`, amountMinor: 500 }),
    );
    const layout = layoutRuler(items);
    expect(layout.markers).toHaveLength(1);
    const marker = layout.markers[0]!;
    expect(marker.stacked).toBe(true);
    expect(marker.items).toHaveLength(STACK_LIMIT + 1);
    expect(marker.totalMinor).toBe(500 * (STACK_LIMIT + 1));
  });

  it("flips flags near the right edge", () => {
    const layout = layoutRuler([item({ day: RULER_DAYS })]);
    expect(layout.markers[0]?.flipped).toBe(true);
    expect(layout.markers[0]?.position).toBeGreaterThan(FLIP_THRESHOLD);
  });

  it("drops items outside the 0..30 window", () => {
    const layout = layoutRuler([item({ day: -1 }), item({ day: 31 })]);
    expect(layout.markers).toEqual([]);
  });

  it("orders same-day stacks by amount (largest first)", () => {
    const layout = layoutRuler([
      item({ day: 3, name: "Small", amountMinor: 100 }),
      item({ day: 3, name: "Big", amountMinor: 9000 }),
    ]);
    expect(layout.markers[0]?.items[0]?.name).toBe("Big");
  });
});
