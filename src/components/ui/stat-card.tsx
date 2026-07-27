import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  tone?: "default" | "amber" | "mint";
  label: string;
  figure: string;
  subline: string;
}

const TONE_CHIP: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-accent-soft text-accent",
  amber: "bg-amber-soft text-amber",
  mint: "bg-mint-soft text-mint",
};

/** One stat: icon chip, label, mono figure, faint subline. Shared by the
 * dashboard KPI row and the analytics summary strip. */
export function StatCard({
  icon: Icon,
  tone = "default",
  label,
  figure,
  subline,
}: StatCardProps) {
  return (
    <div className="rounded-card border-line bg-surface border p-4">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "flex size-6 items-center justify-center rounded-[7px]",
            TONE_CHIP[tone],
          )}
        >
          <Icon size={13} strokeWidth={1.75} />
        </span>
        <span className="text-muted text-xs">{label}</span>
      </div>
      <p className="font-data text-text mt-2.5 text-[21px] leading-none font-medium tracking-tight">
        {figure}
      </p>
      <p className="text-faint mt-1.5 text-[11.5px]">{subline}</p>
    </div>
  );
}
