import { cn } from "@/lib/utils";

/**
 * The small hued square that identifies a category across the app (sidebar
 * accordion, tables, legends, command palette). `color` may be a hex value or
 * a CSS variable like `var(--color-faint)` for the uncategorized bucket.
 */
export function CategoryMark({
  color,
  className,
}: {
  color: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("size-[7px] shrink-0 rounded-[2px]", className)}
      style={{ backgroundColor: color }}
    />
  );
}
