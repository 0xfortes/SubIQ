import type { Metadata } from "next";
import {
  getWorkspaceCurrency,
  InsightList,
  listActiveInsights,
} from "@/features/insights";
import { getUserTimezone } from "@/features/settings";
import { requireWorkspace } from "@/server/authz";

export const metadata: Metadata = { title: "Insights — SubIQ" };

export default async function InsightsPage() {
  const { userId, workspaceId } = await requireWorkspace();
  const [insights, currency, timeZone] = await Promise.all([
    listActiveInsights(workspaceId),
    getWorkspaceCurrency(workspaceId),
    getUserTimezone(userId),
  ]);

  return (
    <InsightList insights={insights} currency={currency} timeZone={timeZone} />
  );
}
