import { formatMoney } from "@/lib/money";
import type { CategorySlice } from "../lib";

interface CategoryBreakdownProps {
  slices: CategorySlice[];
  currency: string;
  foreignCount: number;
}

/** Share of monthly spend per category as a direct-labeled bar list —
 * identity is carried by the label, the category hue is reinforcement. */
export function CategoryBreakdown({
  slices,
  currency,
  foreignCount,
}: CategoryBreakdownProps) {
  return (
    <section
      aria-label="Monthly spend by category"
      className="rounded-card border-line bg-surface border p-4"
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium tracking-tight">By category</h2>
        <p className="text-faint text-[11.5px]">share of monthly spend</p>
      </header>

      {slices.length === 0 ? (
        <p className="text-muted mt-6 mb-2 text-center text-[13px]">
          Nothing to break down yet.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {slices.map((slice) => {
            const hue = slice.color ?? "var(--color-faint)";
            return (
              <li
                key={slice.id}
                aria-label={`${slice.name}, ${formatMoney(slice.monthlyMinor, currency)} per month, ${Math.round(slice.share * 100)}%`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      aria-hidden
                      className="size-[7px] shrink-0 rounded-[2px]"
                      style={{ backgroundColor: hue }}
                    />
                    <span className="text-text truncate text-[12.5px]">
                      {slice.name}
                    </span>
                    <span className="text-faint text-[10.5px]">
                      · {slice.count}
                    </span>
                  </span>
                  <span className="font-data text-muted shrink-0 text-xs">
                    {formatMoney(slice.monthlyMinor, currency)}
                    <span className="text-faint ml-1.5 text-[10.5px]">
                      {Math.round(slice.share * 100)}%
                    </span>
                  </span>
                </div>
                <div
                  aria-hidden
                  className="rounded-pill bg-wash mt-1.5 h-1 overflow-hidden"
                >
                  <div
                    className="rounded-pill h-full"
                    style={{
                      width: `${slice.share * 100}%`,
                      backgroundColor: hue,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {foreignCount > 0 ? (
        <p className="text-faint mt-3 text-[10.5px]">
          {foreignCount} in other currencies excluded
        </p>
      ) : null}
    </section>
  );
}
