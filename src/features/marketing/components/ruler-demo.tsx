import { formatMoney } from "@/lib/money";
import { layoutRuler, RULER_DAYS, type RulerItem } from "@/lib/renewal-ruler";
import { cn } from "@/lib/utils";

/**
 * The hero object: the product's real Renewal Ruler geometry
 * (lib/renewal-ruler.ts) on curated demo data. Decorative — the caption
 * carries the information; flags stagger in when scrolled into view via
 * the ancestor Reveal's data-visible.
 */

const DEMO_ITEMS: RulerItem[] = [
  { id: "figma", day: 2, amountMinor: 1500, currency: "USD", name: "Figma" },
  {
    id: "spotify",
    day: 5,
    amountMinor: 1099,
    currency: "USD",
    name: "Spotify",
  },
  { id: "claude", day: 9, amountMinor: 2000, currency: "USD", name: "Claude" },
  {
    id: "netflix",
    day: 13,
    amountMinor: 1549,
    currency: "USD",
    name: "Netflix",
  },
  { id: "adobe", day: 17, amountMinor: 5999, currency: "USD", name: "Adobe" },
  { id: "notion", day: 22, amountMinor: 1200, currency: "USD", name: "Notion" },
  { id: "whoop", day: 26, amountMinor: 3000, currency: "USD", name: "Whoop" },
  { id: "vercel", day: 29, amountMinor: 2000, currency: "USD", name: "Vercel" },
];

const URGENT_DAYS = 4;
const LABEL_DAYS = [0, 7, 14, 21, 30];
const TRACK_BOTTOM_PX = 22;
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
        className="rounded-card border-line bg-surface/80 border p-5 backdrop-blur-sm"
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

        <div
          className="relative mt-4"
          style={{ height: layout.trackHeightPx + TRACK_BOTTOM_PX }}
        >
          <div
            className="bg-line-strong absolute right-0 left-0 h-px"
            style={{ bottom: TRACK_BOTTOM_PX }}
          />
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
          {LABEL_DAYS.map((day) => (
            <span
              key={day}
              className={cn(
                "font-data text-faint absolute bottom-0 text-[10px]",
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
            return (
              <div
                key={marker.day}
                className="absolute w-4 -translate-x-1/2"
                style={{
                  left: `${marker.position * 100}%`,
                  bottom: TRACK_BOTTOM_PX,
                  height: marker.stemPx,
                }}
              >
                <span
                  className={cn(
                    "absolute bottom-0 left-1/2 h-full w-[1.5px] -translate-x-1/2",
                    urgent ? "bg-amber" : "bg-line-strong",
                  )}
                />
                <span
                  className={cn(
                    "marketing-flag font-data absolute top-0 border px-1.5 py-0.5 text-[10.5px] whitespace-nowrap",
                    marker.flipped
                      ? "rounded-tl-flag rounded-tr-flag rounded-bl-flag right-1/2"
                      : "rounded-tl-flag rounded-tr-flag rounded-br-flag left-1/2",
                    urgent
                      ? "border-amber/50 bg-amber-soft text-amber"
                      : "border-line-strong bg-surface-2 text-muted",
                  )}
                  style={{
                    transitionDelay: `${FLAG_BASE_DELAY_MS + index * FLAG_STAGGER_MS}ms`,
                  }}
                >
                  {formatMoney(item.amountMinor, item.currency)}
                </span>
              </div>
            );
          })}
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
