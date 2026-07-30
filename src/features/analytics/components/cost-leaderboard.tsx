import { ServiceAvatar } from "@/components/ui/service-avatar";
import { formatMoney } from "@/lib/money";
import { LEADERBOARD_LIMIT, type LeaderboardRow } from "../lib";

interface CostLeaderboardProps {
  rows: LeaderboardRow[];
  currency: string;
}

/** Subscriptions ranked by monthly-equivalent cost with share-of-total. */
export function CostLeaderboard({ rows, currency }: CostLeaderboardProps) {
  const visible = rows.slice(0, LEADERBOARD_LIMIT);
  const hidden = rows.length - visible.length;

  return (
    <section
      aria-label="Most expensive subscriptions"
      className="rounded-card border-line bg-surface border p-4"
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium tracking-tight">
          Top subscriptions
        </h2>
        <p className="text-faint text-[11.5px]">by monthly cost</p>
      </header>

      {visible.length === 0 ? (
        <p className="text-muted mt-6 mb-2 text-center text-[13px]">
          Nothing to rank yet.
        </p>
      ) : (
        <ol className="mt-3 flex flex-col">
          {visible.map((row, index) => (
            <li
              key={row.id}
              className="border-line flex items-center gap-2.5 border-b py-2 last:border-b-0"
            >
              <span
                aria-hidden
                className="font-data text-faint w-4 shrink-0 text-right text-[10.5px]"
              >
                {index + 1}
              </span>
              <ServiceAvatar name={row.name} color={row.color} />
              <div className="min-w-0 flex-1">
                <p className="text-text truncate text-[12.5px] font-medium">
                  {row.name}
                </p>
                {row.categoryName ? (
                  <p className="text-faint flex items-center gap-1.5 text-[11px]">
                    <span
                      aria-hidden
                      className="size-[6px] rounded-[2px]"
                      style={{
                        backgroundColor:
                          row.categoryColor ?? "var(--color-faint)",
                      }}
                    />
                    {row.categoryName}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="font-data text-text text-[12.5px]">
                  {formatMoney(row.monthlyMinor, currency)}
                  <span className="text-faint text-[10.5px]">/mo</span>
                </p>
                {row.cycle !== "/mo" ? (
                  <p className="font-data text-faint text-[10.5px]">
                    {formatMoney(row.amountMinor, row.currency)}
                    {row.cycle}
                  </p>
                ) : null}
              </div>
              <div className="w-14 shrink-0">
                <p className="font-data text-muted text-right text-[10.5px]">
                  {Math.round(row.share * 100)}%
                </p>
                <div
                  aria-hidden
                  className="rounded-pill bg-wash mt-1 h-1 overflow-hidden"
                >
                  <div
                    className="rounded-pill bg-accent h-full"
                    style={{ width: `${row.share * 100}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {hidden > 0 ? (
        <p className="text-faint mt-3 text-[10.5px]">
          +{hidden} more subscription{hidden === 1 ? "" : "s"}
        </p>
      ) : null}
    </section>
  );
}
