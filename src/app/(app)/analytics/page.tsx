import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  AnalyticsSummary,
  CategoryBreakdown,
  CostLeaderboard,
  getAnalyticsData,
  ProjectionChart,
} from "@/features/analytics";
import { getUserTimezone } from "@/features/settings";
import { requireWorkspace } from "@/server/authz";

export const metadata: Metadata = { title: "Analytics — SubIQ" };

export default async function AnalyticsPage() {
  const { userId, workspaceId } = await requireWorkspace();
  const timeZone = await getUserTimezone(userId);
  const data = await getAnalyticsData(workspaceId, timeZone);

  if (data.billingCount === 0) {
    return (
      <div className="rounded-card border-line bg-surface border p-6">
        <h1 className="text-sm font-medium tracking-tight">Analytics</h1>
        <p className="text-muted mt-1 text-xs">
          No subscriptions to analyze yet. Track your first subscription to see
          where your money goes.
        </p>
        <Link
          href="/subscriptions?new=1"
          className="text-accent focus-visible:outline-accent mt-3 inline-flex items-center gap-1 rounded-sm text-xs hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Add subscription
          <ArrowRight size={11} aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <AnalyticsSummary data={data} />
      <ProjectionChart data={data.projection} currency={data.currency} />
      <div className="grid gap-3 min-[1020px]:grid-cols-[1fr_1.4fr]">
        <CategoryBreakdown
          slices={data.slices}
          currency={data.currency}
          foreignCount={data.foreignCount}
        />
        <CostLeaderboard rows={data.leaderboard} currency={data.currency} />
      </div>
    </div>
  );
}
