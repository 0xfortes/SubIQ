import { formatMoney } from "@/lib/money";
import { layoutRuler, RULER_DAYS, type RulerItem } from "@/lib/renewal-ruler";
import { cn } from "@/lib/utils";
import { ServiceAvatar } from "@/components/ui/service-avatar";

/**
 * The hero object: the product's real Renewal Ruler geometry
 * (lib/renewal-ruler.ts) on curated demo data. Decorative — the caption
 * carries the information; flags stagger in when scrolled into view via
 * the ancestor Reveal's data-visible. Each renewal reads as a category-hued
 * node + a letter-avatar flag, matching the preview's "Coming up" list.
 */

const AMBER = "#F2B25C";

// Days are spaced so the wider avatar flags never collide within a lane
// (same-lane items stay ≥5 days apart; closer ones fall to the raised lane).
const DEMO_ITEMS: RulerItem[] = [
  {
    id: "figma",
    day: 2,
    amountMinor: 1500,
    currency: "USD",
    name: "Figma",
    color: "#8B93FF",
  },
  {
    id: "spotify",
    day: 5,
    amountMinor: 1099,
    currency: "USD",
    name: "Spotify",
    color: "#F0708A",
  },
  {
    id: "claude",
    day: 10,
    amountMinor: 2000,
    currency: "USD",
    name: "Claude",
    color: "#C9A0F5",
  },
  {
    id: "netflix",
    day: 15,
    amountMinor: 1549,
    currency: "USD",
    name: "Netflix",
    color: "#F0708A",
  },
  {
    id: "adobe",
    day: 20,
    amountMinor: 5999,
    currency: "USD",
    name: "Adobe",
    color: "#8B93FF",
  },
  {
    id: "notion",
    day: 23,
    amountMinor: 1200,
    currency: "USD",
    name: "Notion",
    color: "#4FD1A1",
  },
  {
    id: "vercel",
    day: 29,
    amountMinor: 2000,
    currency: "USD",
    name: "Vercel",
    color: "#6FA8F5",
  },
];

const URGENT_DAYS = 4;
const LABEL_DAYS = [0, 7, 14, 21, 30];
const TRACK_BOTTOM_PX = 26;
const FLAG_STAGGER_MS = 70;
/** Let the hero headline land before the flags start popping in. */
const FLAG_BASE_DELAY_MS = 450;

export function RulerDemo() {
  const layout = layoutRuler(DEMO_ITEMS);
  const total = DEMO_ITEMS.reduce((sum, item) => sum + item.amountMinor, 0);

  return (
    <figure className="w-full">
      <div
        aria-hidden
        className="rounded-card border-line bg-surface/80 border p-5 backdrop-blur-sm sm:p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-text text-[13px] font-medium tracking-tight">
            Next 30 days
          </p>
          <p className="text-faint text-[11.5px]">
            {DEMO_ITEMS.length} renewals ·{" "}
            <span className="font-data text-muted">
              {formatMoney(total, "USD")}
            </span>{" "}
            leaving your account
          </p>
        </div>

        <div className="mt-6 overflow-x-auto pb-2">
          <div
            className="relative w-full min-w-[680px]"
            style={{ height: layout.trackHeightPx + TRACK_BOTTOM_PX }}
          >
            {/* Baseline */}
            <div
              className="bg-line-strong absolute right-0 left-0 h-px"
              style={{ bottom: TRACK_BOTTOM_PX }}
            />
            {/* Day ticks (weekly heavier) */}
            {Array.from({ length: RULER_DAYS + 1 }, (_, day) => (
              <div
                key={day}
                className={cn(
                  "absolute w-px",
                  day % 7 === 0 ? "bg-line-strong h-2.5" : "bg-line h-1.5",
                )}
                style={{
                  left: `${(day / RULER_DAYS) * 100}%`,
                  bottom: TRACK_BOTTOM_PX,
                }}
              />
            ))}
            {/* Today anchor */}
            <span
              className="bg-accent rounded-pill absolute left-0 size-2 -translate-x-1/2 translate-y-1/2"
              style={{ bottom: TRACK_BOTTOM_PX }}
            />
            {LABEL_DAYS.map((day) => (
              <span
                key={day}
                className={cn(
                  "font-data absolute bottom-0 text-[10px]",
                  day === 0 ? "text-muted" : "text-faint",
                  day === RULER_DAYS && "-translate-x-full",
                  day !== 0 && day !== RULER_DAYS && "-translate-x-1/2",
                )}
                style={{ left: `${(day / RULER_DAYS) * 100}%` }}
              >
                {day === 0 ? "Today" : `+${day}d`}
              </span>
            ))}

            {layout.markers.map((marker, index) => {
              const item = marker.items[0]!;
              const urgent = marker.day <= URGENT_DAYS;
              const hue = urgent ? AMBER : (item.color ?? "#8B93FF");
              return (
                <div
                  key={marker.day}
                  title={item.name}
                  className="group absolute w-4 -translate-x-1/2"
                  style={{
                    left: `${marker.position * 100}%`,
                    bottom: TRACK_BOTTOM_PX,
                    height: marker.stemPx,
                  }}
                >
                  {/* Stem */}
                  <span
                    className="absolute bottom-0 left-1/2 h-full w-[1.5px] -translate-x-1/2 opacity-45 transition-opacity duration-150 group-hover:opacity-100"
                    style={{ backgroundColor: hue }}
                  />
                  {/* Node on the baseline */}
                  <span
                    className="rounded-pill absolute bottom-0 left-1/2 size-[7px] -translate-x-1/2 translate-y-1/2"
                    style={{ backgroundColor: hue }}
                  />
                  {/* Flag: letter avatar + amount */}
                  <div
                    className={cn(
                      "marketing-flag bg-surface-2 absolute top-0 flex items-center gap-1.5 border px-1.5 py-1 whitespace-nowrap",
                      marker.flipped
                        ? "rounded-tl-flag rounded-tr-flag rounded-bl-flag right-1/2"
                        : "rounded-tl-flag rounded-tr-flag rounded-br-flag left-1/2",
                      urgent ? "border-amber/50" : "border-line-strong",
                    )}
                    style={{
                      transitionDelay: `${FLAG_BASE_DELAY_MS + index * FLAG_STAGGER_MS}ms`,
                    }}
                  >
                    <ServiceAvatar name={item.name} color={hue} size="xs" />
                    <span
                      className={cn(
                        "font-data text-[10.5px]",
                        urgent ? "text-amber" : "text-text",
                      )}
                    >
                      {formatMoney(item.amountMinor, item.currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <figcaption className="sr-only">
        Example renewal timeline: eight subscriptions renewing across the next
        30 days totalling {formatMoney(total, "USD")}, with imminent renewals
        highlighted in amber.
      </figcaption>
    </figure>
  );
}
