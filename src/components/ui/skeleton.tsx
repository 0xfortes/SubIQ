import { cn } from "@/lib/utils";

/** Loading placeholder block — surface-2 per DESIGN.md, pulse only when
 * motion is allowed. Shape comes from the caller's className. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "bg-surface-2 rounded-md motion-safe:animate-pulse",
        className,
      )}
    />
  );
}
