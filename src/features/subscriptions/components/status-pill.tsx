import { SubscriptionStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<
  SubscriptionStatus,
  { label: string; pill: string; dot: string }
> = {
  [SubscriptionStatus.ACTIVE]: {
    label: "Active",
    pill: "bg-mint-soft text-mint",
    dot: "bg-mint",
  },
  [SubscriptionStatus.TRIAL]: {
    label: "Trial",
    pill: "bg-amber-soft text-amber",
    dot: "bg-amber",
  },
  [SubscriptionStatus.PAUSED]: {
    label: "Paused",
    pill: "bg-surface-2 text-muted",
    dot: "bg-muted",
  },
  [SubscriptionStatus.CANCELLED]: {
    label: "Cancelled",
    pill: "bg-surface-2 text-faint",
    dot: "bg-faint",
  },
};

export function StatusPill({ status }: { status: SubscriptionStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "rounded-pill inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px]",
        style.pill,
      )}
    >
      <span className={cn("rounded-pill size-1.5", style.dot)} aria-hidden />
      {style.label}
    </span>
  );
}
