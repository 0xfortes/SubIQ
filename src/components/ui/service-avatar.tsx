import { fallbackColor } from "@/lib/colors";
import { cn } from "@/lib/utils";

/**
 * Letter avatar tinted with a service's brand hue (falling back to a
 * deterministic hue derived from the name). Shared by the subscriptions
 * table, the analytics leaderboard, and the marketing preview so the three
 * can't drift apart.
 */
const SIZES = {
  xs: "size-4 rounded-[4px] text-[9px] font-semibold",
  sm: "size-7 rounded-[7px] text-[11px]",
  md: "size-[30px] rounded-md text-[13px]",
} as const;

export function ServiceAvatar({
  name,
  color,
  size = "md",
  className,
}: {
  name: string;
  color?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const hue = color ?? fallbackColor(name);
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center font-medium",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: `${hue}1F`, color: hue }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
