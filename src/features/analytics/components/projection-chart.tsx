"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/money";
import type { ProjectionMonth } from "../lib";

interface ProjectionChartProps {
  data: ProjectionMonth[];
  currency: string;
}

function ProjectionTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: { payload?: ProjectionMonth }[];
  currency: string;
}) {
  const month = payload?.[0]?.payload;
  if (!active || !month) return null;
  return (
    <div className="border-line-strong bg-surface-2 rounded-[10px] border px-2.5 py-1.5 shadow-lg shadow-black/30">
      <p className="text-faint text-[10px]">{month.longLabel}</p>
      <p className="font-data text-text text-[12.5px]">
        {formatMoney(month.totalMinor, currency)}
      </p>
      <p className="text-faint text-[10px]">
        {month.count} charge{month.count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

/** Real upcoming charges per calendar month — the recurrence engine's
 * output, unlike the dashboard trend's backward approximation. */
export function ProjectionChart({ data, currency }: ProjectionChartProps) {
  const first = data[0]?.longLabel;
  const last = data[data.length - 1]?.longLabel;
  return (
    <section
      aria-label="Projected charges for the next 12 months"
      className="rounded-card border-line bg-surface border p-4"
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium tracking-tight">
          12-month projection
        </h2>
        {first && last ? (
          <p className="font-data text-faint text-[11.5px]">
            {first} – {last}
          </p>
        ) : null}
      </header>
      <div className="mt-3 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
          >
            <CartesianGrid
              stroke="var(--color-line)"
              vertical={false}
              strokeDasharray="0"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={0}
              tick={{
                fill: "var(--color-faint)",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
              }}
              dy={6}
            />
            <YAxis
              width={44}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) =>
                formatMoney(value, currency, undefined, { whole: true })
              }
              tick={{
                fill: "var(--color-faint)",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
              }}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              content={<ProjectionTooltip currency={currency} />}
            />
            <Bar
              dataKey="totalMinor"
              fill="var(--color-accent)"
              radius={[3, 3, 0, 0]}
              maxBarSize={26}
              // DESIGN.md: no entrance animations on page content.
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
