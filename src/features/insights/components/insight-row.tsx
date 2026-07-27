import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CalendarClock, Copy, PiggyBank } from "lucide-react";
import { InsightType } from "@/generated/prisma/enums";
import { formatDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { DismissInsightButton } from "./dismiss-insight-button";

export interface InsightItem {
  id: string;
  type: InsightType;
  title: string;
  body: string;
  savingsMinor: number | null;
  currency: string | null;
}

const TYPE_STYLE: Record<
  InsightType,
  { icon: LucideIcon; chip: string; action: string }
> = {
  [InsightType.DUPLICATE_CATEGORY]: {
    icon: Copy,
    chip: "bg-rose-soft text-rose",
    action: "Compare usage",
  },
  [InsightType.TRIAL_ENDING]: {
    icon: CalendarClock,
    chip: "bg-amber-soft text-amber",
    action: "Decide before it converts",
  },
  [InsightType.ANNUAL_SAVINGS]: {
    icon: PiggyBank,
    chip: "bg-mint-soft text-mint",
    action: "Switch to annual",
  },
};

/**
 * One insight line — shared by the dashboard panel and the insights page.
 * `foundAt` adds a faint discovery date (page only; the panel stays dense),
 * rendered in the user's timezone — it's a real instant, not a calendar day.
 */
export function InsightRow({
  insight,
  foundAt,
  timeZone = "UTC",
}: {
  insight: InsightItem;
  foundAt?: Date;
  timeZone?: string;
}) {
  const style = TYPE_STYLE[insight.type];
  const Icon = style.icon;
  return (
    <li className="group hover:bg-wash flex gap-2.5 rounded-md p-2 transition-colors duration-100">
      <span
        aria-hidden
        className={cn(
          "flex size-[26px] shrink-0 items-center justify-center rounded-[7px]",
          style.chip,
        )}
      >
        <Icon size={13} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-text text-[12.5px] font-medium">{insight.title}</p>
        <p className="text-muted mt-0.5 text-xs">{insight.body}</p>
        <div className="mt-1 flex items-center gap-2.5">
          <Link
            href="/subscriptions"
            className="text-accent focus-visible:outline-accent inline-flex items-center gap-1 rounded-sm text-xs hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {style.action}
            <ArrowRight size={11} aria-hidden />
          </Link>
          {foundAt ? (
            <span className="text-faint text-[11px]">
              Found {formatDay(foundAt, new Date(), timeZone)}
            </span>
          ) : null}
        </div>
      </div>
      <DismissInsightButton id={insight.id} title={insight.title} />
    </li>
  );
}
