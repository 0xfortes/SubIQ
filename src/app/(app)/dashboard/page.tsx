import {
  getDashboardData,
  InsightsPanel,
  KpiRow,
  RenewalRuler,
  SpendingTrend,
} from "@/features/dashboard";
import { listActiveInsights, recoverableTotalMinor } from "@/features/insights";
import { getUserTimezone } from "@/features/settings";
import {
  listCategories,
  listFiltersSchema,
  listSubscriptions,
  SubscriptionsView,
} from "@/features/subscriptions";
import { requireWorkspace } from "@/server/authz";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId, workspaceId } = await requireWorkspace();
  const params = await searchParams;
  const parsed = listFiltersSchema.safeParse({
    q: typeof params.q === "string" ? params.q : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    category: typeof params.category === "string" ? params.category : undefined,
  });
  const filters = parsed.success ? parsed.data : listFiltersSchema.parse({});

  const timeZone = await getUserTimezone(userId);
  const [data, insights, rows, categories] = await Promise.all([
    getDashboardData(workspaceId, filters.category, timeZone),
    listActiveInsights(workspaceId),
    listSubscriptions(workspaceId, filters),
    listCategories(workspaceId),
  ]);

  const savings = recoverableTotalMinor(insights, data.defaultCurrency);

  return (
    <div className="flex flex-col gap-3">
      <KpiRow
        kpis={data.kpis}
        savingsMinor={savings}
        savingsCount={insights.length}
      />
      <RenewalRuler
        items={data.rulerItems}
        totalMinor={data.rulerTotalMinor}
        currency={data.defaultCurrency}
        timeZone={timeZone}
      />
      <div className="grid gap-3 min-[1020px]:grid-cols-[1.9fr_1fr]">
        <SpendingTrend data={data.trend} currency={data.defaultCurrency} />
        <InsightsPanel insights={insights} currency={data.defaultCurrency} />
      </div>
      <SubscriptionsView
        rows={rows}
        categories={categories}
        filters={filters}
        openNew={params.new === "1"}
        timeZone={timeZone}
        defaultCurrency={data.defaultCurrency}
      />
    </div>
  );
}
