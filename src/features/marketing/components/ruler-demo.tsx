import { RULER_DAYS } from "@/lib/renewal-ruler";
import { resolveBrand } from "@/lib/brands";
import { isDarkColor } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { ServiceIcon } from "@/components/ui/service-icon";

/**
 * The hero object: the product's "Next 30 days" language on curated demo data,
 * as recognizable service logos sitting directly on the timeline — the track
 * explains itself. Decorative (the caption carries the meaning); no prices or
 * categories, so it stays currency-agnostic. Logos build in left-to-right on
 * scroll via the ancestor Reveal's data-visible.
 */

const AMBER = "#F2B25C";
const URGENT_DAYS = 4;
const TRACK_HEIGHT = 112;
const BASELINE = 24;
const STEM_PX = 24;
const STAGGER_MS = 70;
/** Let the hero headline land before the timeline starts building in. */
const BASE_DELAY_MS = 450;

interface DemoRenewal {
  name: string;
  /** Whole days from today; curated spacing so logo chips never collide. */
  day: number;
  /** Fallback hue for services without a brand color (or a dark one). */
  color: string;
}

const DEMO_ITEMS: DemoRenewal[] = [
  { name: "Figma", day: 2, color: "#8B93FF" },
  { name: "Spotify", day: 5, color: "#4FD1A1" },
  { name: "Claude", day: 10, color: "#C9A0F5" },
  { name: "Netflix", day: 15, color: "#F0708A" },
  { name: "Adobe", day: 20, color: "#8B93FF" },
  { name: "Notion", day: 23, color: "#4FD1A1" },
  { name: "Vercel", day: 29, color: "#6FA8F5" },
];

/** The vivid color to identify a renewal by: its real brand color when it reads
 * on dark, else the curated fallback hue. */
function nodeHue(item: DemoRenewal): string {
  const brand = resolveBrand(item.name);
  if (brand && !isDarkColor(brand.hex)) return `#${brand.hex}`;
  return item.color;
}

function relativeLabel(day: number): string {
  if (day === 0) return "today";
  if (day === 1) return "tomorrow";
  return `in ${day} days`;
}

export function RulerDemo() {
  const items = [...DEMO_ITEMS].sort((a, b) => a.day - b.day);
  const soonest = items[0]!;

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
            <span className="font-data text-muted">{items.length}</span>{" "}
            renewals ahead
          </p>
        </div>

        {/* Timeline: logos sit on the track */}
        <div className="mt-8 overflow-x-auto pb-1">
          <div
            className="relative w-full min-w-[560px]"
            style={{ height: TRACK_HEIGHT }}
          >
            <div
              className="bg-line-strong absolute right-0 left-0 h-px"
              style={{ bottom: BASELINE }}
            />
            {Array.from({ length: RULER_DAYS + 1 }, (_, day) => (
              <div
                key={day}
                className={cn(
                  "absolute w-px",
                  day % 7 === 0 ? "bg-line-strong h-2" : "bg-line h-1",
                )}
                style={{
                  left: `${(day / RULER_DAYS) * 100}%`,
                  bottom: BASELINE,
                }}
              />
            ))}
            <span
              className="bg-accent rounded-pill absolute size-2 -translate-x-1/2 translate-y-1/2"
              style={{ left: 0, bottom: BASELINE }}
            />
            <span
              className="font-data text-muted absolute bottom-0 text-[10px]"
              style={{ left: 0 }}
            >
              Today
            </span>
            <span
              className="font-data text-faint absolute bottom-0 -translate-x-full text-[10px]"
              style={{ left: "100%" }}
            >
              +30d
            </span>

            {items.map((item, index) => {
              const urgent = item.day <= URGENT_DAYS;
              const hue = urgent ? AMBER : nodeHue(item);
              return (
                <div
                  key={item.name}
                  className="marketing-flag absolute -translate-x-1/2"
                  style={{
                    left: `${(item.day / RULER_DAYS) * 100}%`,
                    bottom: BASELINE,
                    height: STEM_PX,
                    transitionDelay: `${BASE_DELAY_MS + index * STAGGER_MS}ms`,
                  }}
                >
                  {/* Stem */}
                  <span
                    className={cn(
                      "absolute bottom-0 left-1/2 h-full w-[1.5px] -translate-x-1/2",
                      urgent ? "" : "opacity-50",
                    )}
                    style={{ backgroundColor: hue }}
                  />
                  {/* Node on the baseline */}
                  <span
                    className="rounded-pill absolute bottom-0 left-1/2 size-[7px] -translate-x-1/2 translate-y-1/2"
                    style={{ backgroundColor: hue }}
                  />
                  {/* Flag: day label + logo, stacked above the stem */}
                  <div className="absolute bottom-full left-1/2 mb-1.5 flex -translate-x-1/2 flex-col items-center gap-1.5">
                    <span
                      className={cn(
                        "font-data text-[9.5px]",
                        urgent ? "text-amber" : "text-faint",
                      )}
                    >
                      {item.day}d
                    </span>
                    <ServiceIcon
                      name={item.name}
                      color={item.color}
                      size={urgent ? "md" : "sm"}
                      shape="circle"
                      className={cn(
                        "ring-2",
                        urgent ? "ring-amber/60" : "ring-surface",
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Caption: the one thing that matters, as a plain line */}
        <p
          className="marketing-flag text-muted mt-5 text-[13px]"
          style={{
            transitionDelay: `${BASE_DELAY_MS + items.length * STAGGER_MS}ms`,
          }}
        >
          <span className="text-text font-medium">{soonest.name}</span> renews
          next, <span className="text-amber">{relativeLabel(soonest.day)}</span>
          .
        </p>
      </div>
      <figcaption className="sr-only">
        Example renewal timeline: {items.length} subscriptions laid out across
        the next 30 days, with {soonest.name} renewing{" "}
        {relativeLabel(soonest.day)}.
      </figcaption>
    </figure>
  );
}
