"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";
import { formatDay, todayInZone } from "@/lib/dates";
import { fallbackColor, isDarkColor } from "@/lib/colors";
import { resolveBrand } from "@/lib/brands";
import {
  bucketRenewals,
  groupRenewalsByDay,
  RULER_DAYS,
  THIS_WEEK_MAX,
  type DayGroup,
  type RulerItem,
} from "@/lib/renewal-ruler";
import { cn } from "@/lib/utils";
import { ServiceIcon } from "@/components/ui/service-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Renewals within this many days read as "money leaving soon" (amber). */
const URGENT_DAYS = 4;
const DAY_MS = 24 * 60 * 60 * 1000;
const BAND_HEIGHT = 46;
const BASELINE = 22;
const AMBER = "var(--color-amber)";
const URGENT_RING = "rgba(242, 178, 92, 0.28)";

const WEEKDAY_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC",
});

/** The vivid color to identify a renewal by: its real brand color when it reads
 * on dark, else the stored category hue, else a deterministic fallback. */
function displayHue(item: RulerItem): string {
  const brand = resolveBrand(item.name);
  if (brand && !isDarkColor(brand.hex)) return `#${brand.hex}`;
  return item.color ?? fallbackColor(item.name);
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
  const todayStart = todayInZone(timeZone);
  const groups = groupRenewalsByDay(items);
  const { upNext, thisWeek, nextWeek, later } = bucketRenewals(items);
  const [activeDay, setActiveDay] = useState<number | null>(null);

  const dayToDate = (day: number) =>
    new Date(todayStart.getTime() + day * DAY_MS);

  function relativeLabel(day: number): string {
    if (day === 0) return "Today";
    if (day === 1) return "Tomorrow";
    return `in ${day} days`;
  }

  function rowDateLabel(item: RulerItem): string {
    if (item.day === 0) return "Today";
    if (item.day === 1) return "Tomorrow";
    const date = dayToDate(item.day);
    const primary =
      item.day <= THIS_WEEK_MAX ? WEEKDAY_FMT.format(date) : formatDay(date);
    return `${primary} · ${item.day}d`;
  }

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
        <>
          {/* ---- Spatial band: the month at a glance ---- */}
          <TooltipProvider delayDuration={120}>
            <div className="relative mt-4" style={{ height: BAND_HEIGHT }}>
              <div
                aria-hidden
                className="bg-line-strong absolute right-0 left-0 h-px"
                style={{ bottom: BASELINE }}
              />
              {Array.from({ length: RULER_DAYS + 1 }, (_, day) => (
                <div
                  aria-hidden
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
                className="font-data text-muted absolute bottom-0 text-[10px]"
                style={{ left: 0 }}
              >
                Today
              </span>
              <span
                className="font-data text-faint absolute bottom-0 -translate-x-1/2 text-[10px]"
                style={{ left: "50%" }}
              >
                +15d
              </span>
              <span
                className="font-data text-faint absolute bottom-0 -translate-x-full text-[10px]"
                style={{ left: "100%" }}
              >
                +30d
              </span>

              {groups.map((group) => (
                <BandNode
                  key={group.day}
                  group={group}
                  hue={displayHue(group.items[0]!)}
                  active={activeDay === group.day}
                  currency={currency}
                  dateLabel={formatDay(dayToDate(group.day))}
                  relativeLabel={relativeLabel(group.day)}
                  onActivate={() => setActiveDay(group.day)}
                  onDeactivate={() => setActiveDay(null)}
                />
              ))}
            </div>
          </TooltipProvider>

          {/* ---- Up next: the one thing that matters most ---- */}
          {upNext ? (
            <UpNextRow
              item={upNext}
              currency={currency}
              when={relativeLabel(upNext.day)}
              urgent={upNext.day <= URGENT_DAYS}
              active={activeDay === upNext.day}
              onActivate={() => setActiveDay(upNext.day)}
              onDeactivate={() => setActiveDay(null)}
            />
          ) : null}

          {/* ---- Agenda: exact detail, grouped by when ---- */}
          <AgendaGroup
            label="This week"
            rows={thisWeek}
            currency={currency}
            activeDay={activeDay}
            rowDateLabel={rowDateLabel}
            setActiveDay={setActiveDay}
          />
          <AgendaGroup
            label="Next week"
            rows={nextWeek}
            currency={currency}
            activeDay={activeDay}
            rowDateLabel={rowDateLabel}
            setActiveDay={setActiveDay}
          />
          <AgendaGroup
            label="Later"
            rows={later}
            currency={currency}
            activeDay={activeDay}
            rowDateLabel={rowDateLabel}
            setActiveDay={setActiveDay}
          />
        </>
      )}
    </section>
  );
}

function BandNode({
  group,
  hue,
  active,
  currency,
  dateLabel,
  relativeLabel,
  onActivate,
  onDeactivate,
}: {
  group: DayGroup;
  hue: string;
  active: boolean;
  currency: string;
  dateLabel: string;
  relativeLabel: string;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  const urgent = group.day <= URGENT_DAYS;
  const multi = group.items.length > 1;
  const fill = urgent ? AMBER : hue;
  const ring = urgent ? URGENT_RING : `${hue}40`;
  const label = multi
    ? `${group.items.length} renewals totalling ${formatMoney(group.totalMinor, currency)}, ${relativeLabel.toLowerCase()}`
    : `${group.items[0]!.name}, ${formatMoney(group.items[0]!.amountMinor, currency)}, renews ${dateLabel}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onMouseEnter={onActivate}
          onMouseLeave={onDeactivate}
          onFocus={onActivate}
          onBlur={onDeactivate}
          style={{
            left: `${group.position * 100}%`,
            bottom: BASELINE,
            backgroundColor: fill,
            boxShadow: active ? `0 0 0 4px ${ring}` : undefined,
          }}
          className={cn(
            "focus-visible:outline-accent rounded-pill absolute -translate-x-1/2 translate-y-1/2 transition-[transform,box-shadow] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2",
            multi ? "size-[9px]" : "size-[7px]",
            active && "motion-safe:scale-150",
          )}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="flex flex-col gap-1">
        {group.items.map((item) => (
          <span key={item.id} className="flex items-baseline gap-3">
            <span className="text-text text-[11.5px] font-medium">
              {item.name}
            </span>
            <span className="font-data text-muted ml-auto text-[10.5px]">
              {formatMoney(item.amountMinor, currency)}
              {item.cycle ?? ""}
            </span>
          </span>
        ))}
        <span className="font-data text-faint text-[10px]">
          {dateLabel}
          {group.day === 0 ? " · today" : ` · in ${group.day}d`}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

function UpNextRow({
  item,
  currency,
  when,
  urgent,
  active,
  onActivate,
  onDeactivate,
}: {
  item: RulerItem;
  currency: string;
  when: string;
  urgent: boolean;
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  return (
    <div
      onMouseEnter={onActivate}
      onMouseLeave={onDeactivate}
      className={cn(
        "rounded-control mt-5 flex items-center gap-3 border p-3 transition-colors duration-150",
        active
          ? "border-line-strong bg-surface-2"
          : "border-line bg-surface-2/60",
      )}
    >
      <ServiceIcon
        name={item.name}
        color={item.color}
        size="md"
        shape="circle"
      />
      <div className="min-w-0">
        <p className="text-accent font-data text-[9px] tracking-[0.14em] uppercase">
          Up next
        </p>
        <p className="truncate text-[13.5px] font-medium tracking-tight">
          {item.name}
          {item.category ? (
            <span className="text-faint font-normal"> · {item.category}</span>
          ) : null}
        </p>
      </div>
      <span
        className={cn(
          "font-data ml-auto text-[11px]",
          urgent ? "text-amber" : "text-muted",
        )}
      >
        {when}
      </span>
      <span className="font-data text-[13.5px] tracking-tight">
        {formatMoney(item.amountMinor, currency)}
      </span>
    </div>
  );
}

function AgendaGroup({
  label,
  rows,
  currency,
  activeDay,
  rowDateLabel,
  setActiveDay,
}: {
  label: string;
  rows: RulerItem[];
  currency: string;
  activeDay: number | null;
  rowDateLabel: (item: RulerItem) => string;
  setActiveDay: (day: number | null) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <>
      <p className="text-faint font-data mt-4 mb-1 flex items-center gap-2 text-[9.5px] tracking-[0.12em] uppercase">
        {label}
        <span aria-hidden className="bg-line h-px flex-1" />
      </p>
      <ul>
        {rows.map((item) => (
          <li key={item.id}>
            <div
              onMouseEnter={() => setActiveDay(item.day)}
              onMouseLeave={() => setActiveDay(null)}
              style={{
                boxShadow:
                  activeDay === item.day
                    ? `inset 2px 0 0 ${displayHue(item)}`
                    : undefined,
              }}
              className={cn(
                "rounded-control flex items-center gap-3 px-2 py-1.5 transition-colors duration-150",
                activeDay === item.day ? "bg-wash" : "hover:bg-wash",
              )}
            >
              <ServiceIcon
                name={item.name}
                color={item.color}
                size="sm"
                shape="circle"
              />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] font-medium tracking-tight">
                  {item.name}
                </span>
                <span className="text-faint text-[11px]">
                  {item.category ?? "Uncategorized"}
                </span>
              </div>
              <span className="font-data text-muted ml-auto w-[68px] text-right text-[11px]">
                {rowDateLabel(item)}
              </span>
              <span className="font-data w-[74px] text-right text-[12.5px]">
                {formatMoney(item.amountMinor, currency)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
