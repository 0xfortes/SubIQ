"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/money";
import type { TrendPoint } from "../queries";

interface SpendingTrendProps {
  data: TrendPoint[];
  currency: string;
}

function TrendTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string;
  currency: string;
}) {
  const value = payload?.[0]?.value;
  if (!active || typeof value !== "number") return null;
  return (
    <div className="border-line-strong bg-surface-2 rounded-[10px] border px-2.5 py-1.5 shadow-lg shadow-black/30">
      <p className="text-faint text-[10px]">{label}</p>
      <p className="font-data text-text text-[12.5px]">
        {formatMoney(value, currency)}
      </p>
    </div>
  );
}

export function SpendingTrend({ data, currency }: SpendingTrendProps) {
  return (
    <section
      aria-label="Monthly spending trend"
      className="rounded-card border-line bg-surface border p-4"
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium tracking-tight">Spending trend</h2>
        <p className="text-faint text-[11.5px]">last 6 months</p>
      </header>
      <div className="mt-3 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
          >
            <defs>
              <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-accent)"
                  stopOpacity={0.28}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-accent)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--color-line)"
              vertical={false}
              strokeDasharray="0"
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
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
              cursor={{ stroke: "var(--color-line-strong)", strokeWidth: 1 }}
              content={<TrendTooltip currency={currency} />}
            />
            <Area
              type="monotone"
              dataKey="amountMinor"
              stroke="var(--color-accent)"
              strokeWidth={1.8}
              fill="url(#trend-fill)"
              // DESIGN.md: no entrance animations on page content.
              isAnimationActive={false}
              activeDot={{
                r: 3,
                fill: "var(--color-accent)",
                stroke: "var(--color-surface)",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
