"use client";

import { formatMoney } from "@/lib/money";
import { formatDay, todayInZone } from "@/lib/dates";
import {
  layoutRuler,
  RULER_DAYS,
  type RulerItem,
  type RulerMarker,
} from "@/lib/renewal-ruler";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Renewals within this many days get the amber "money leaving" style. */
const URGENT_DAYS = 4;
const LABEL_DAYS = [0, 7, 14, 21, 30];
const TRACK_BOTTOM_PX = 22; // room for the date label row under the baseline
const DAY_MS = 24 * 60 * 60 * 1000;

/** Day offsets count from the user's local today (a UTC midnight); pure
 * UTC-midnight arithmetic keeps the axis DST-safe. */
function dayToDate(day: number, todayStart: Date): Date {
  return new Date(todayStart.getTime() + day * DAY_MS);
}

function markerAriaLabel(marker: RulerMarker, todayStart: Date): string {
  const date = formatDay(dayToDate(marker.day, todayStart));
  if (marker.stacked) {
    return `${marker.items.length} renewals totalling ${formatMoney(marker.totalMinor, marker.currency)}, on ${date}`;
  }
  const item = marker.items[0]!;
  return `${item.name}, ${formatMoney(item.amountMinor, item.currency)}, renews ${date}`;
}

export function RenewalRuler({
  items,
  totalMinor,
  currency,
  timeZone,
}: {
  items: RulerItem[];
  totalMinor: number;
  currency: string;
  timeZone: string;
}) {
  const layout = layoutRuler(items);
  const todayStart = todayInZone(timeZone);

  return (
    <section
      aria-label="Renewals in the next 30 days"
      className="rounded-card border-line bg-surface border p-4"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium tracking-tight">Next 30 days</h2>
        <p className="text-faint text-[11.5px]">
          {items.length === 0 ? (
            "no renewals coming up"
          ) : (
            <>
              {items.length} renewal{items.length === 1 ? "" : "s"} ·{" "}
              <span className="font-data text-muted">
                {formatMoney(totalMinor, currency)}
              </span>{" "}
              leaving your account
            </>
          )}
        </p>
      </header>

      {items.length === 0 ? (
        <p className="text-muted mt-6 mb-2 text-center text-[13px]">
          No renewals in the next 30 days.
        </p>
      ) : (
        <TooltipProvider delayDuration={120}>
          <div
            className="relative mt-3"
            style={{ height: layout.trackHeightPx + TRACK_BOTTOM_PX }}
          >
            {/* Baseline */}
            <div
              aria-hidden
              className="bg-line-strong absolute right-0 left-0 h-px"
              style={{ bottom: TRACK_BOTTOM_PX }}
            />
            {/* Daily ticks — weekly ones heavier */}
            {Array.from({ length: RULER_DAYS + 1 }, (_, day) => (
              <div
                aria-hidden
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
            {/* Date labels at 0/7/14/21/30 */}
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
                {day === 0 ? "Today" : formatDay(dayToDate(day, todayStart))}
              </span>
            ))}

            {/* Markers: category-hued node + stem + amount flag + tooltip */}
            {layout.markers.map((marker) => {
              const key = `${marker.day}-${marker.lane}`;
              const urgent = marker.day <= URGENT_DAYS;
              const single = marker.stacked ? null : marker.items[0]!;
              const hue = single?.color ?? "var(--color-muted)";

              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={markerAriaLabel(marker, todayStart)}
                      style={
                        {
                          left: `${marker.position * 100}%`,
                          bottom: TRACK_BOTTOM_PX,
                          height: marker.stemPx,
                          "--hue": hue,
                        } as React.CSSProperties
                      }
                      className="group focus-visible:outline-accent absolute w-4 -translate-x-1/2 focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      {/* Stem */}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute bottom-0 left-1/2 h-full w-[1.5px] -translate-x-1/2 transition-opacity duration-100",
                          urgent
                            ? "bg-amber"
                            : "bg-(--hue) opacity-45 group-hover:opacity-100 group-focus-visible:opacity-100",
                        )}
                      />
                      {/* Node on the baseline */}
                      <span
                        aria-hidden
                        className={cn(
                          "rounded-pill absolute bottom-0 left-1/2 size-[7px] -translate-x-1/2 translate-y-1/2",
                          urgent ? "bg-amber" : "bg-(--hue)",
                        )}
                      />
                      {/* Amount flag — one squared corner points down the stem */}
                      <span
                        aria-hidden
                        className={cn(
                          "font-data absolute top-0 border px-1.5 py-0.5 text-[10.5px] whitespace-nowrap transition-colors duration-100",
                          marker.flipped
                            ? "rounded-tl-flag rounded-tr-flag rounded-bl-flag right-1/2"
                            : "rounded-tl-flag rounded-tr-flag rounded-br-flag left-1/2",
                          urgent
                            ? "border-amber/50 bg-amber-soft text-amber"
                            : "border-line-strong bg-surface-2 text-muted group-hover:text-text group-hover:border-(--hue) group-focus-visible:border-(--hue)",
                        )}
                      >
                        {marker.stacked
                          ? `${marker.items.length} · ${formatMoney(marker.totalMinor, marker.currency)}`
                          : formatMoney(single!.amountMinor, single!.currency)}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="flex flex-col gap-1">
                    {marker.items.map((item) => (
                      <span key={item.id} className="flex items-baseline gap-3">
                        <span className="text-text text-[11.5px] font-medium">
                          {item.name}
                        </span>
                        <span className="font-data text-muted ml-auto text-[10.5px]">
                          {formatMoney(item.amountMinor, item.currency)}
                          {item.cycle ?? ""}
                        </span>
                      </span>
                    ))}
                    <span className="font-data text-faint text-[10px]">
                      {formatDay(dayToDate(marker.day, todayStart))}
                      {marker.day === 0 ? " · today" : ` · in ${marker.day}d`}
                    </span>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      )}
    </section>
  );
}
