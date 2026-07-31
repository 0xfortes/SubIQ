/**
 * SubIQ "Renewal Pulse" brand mark — four rounded bars, the rhythm of spend
 * over a renewal cycle, echoing the dashboard's timeline. Inherits color via
 * `currentColor`, so set it with a text color (e.g. `text-accent`). The single
 * source for the mark; the tab/app favicon is `src/app/icon.svg`.
 */
export function BrandMark({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      role="img"
      aria-label="SubIQ"
      className={className}
    >
      <rect x="2.6" y="11" width="3.4" height="10" rx="1.7" />
      <rect x="8.3" y="4" width="3.4" height="17" rx="1.7" />
      <rect x="14" y="13" width="3.4" height="8" rx="1.7" />
      <rect x="19.7" y="7" width="3.4" height="14" rx="1.7" />
    </svg>
  );
}
