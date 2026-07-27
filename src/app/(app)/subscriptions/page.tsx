import { getWorkspaceCurrency } from "@/features/insights";
import { getUserTimezone } from "@/features/settings";
import {
  listCategories,
  listFiltersSchema,
  listSubscriptions,
  SubscriptionsView,
} from "@/features/subscriptions";
import { requireWorkspace } from "@/server/authz";

export default async function SubscriptionsPage({
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
    sort: typeof params.sort === "string" ? params.sort : undefined,
  });
  const filters = parsed.success ? parsed.data : listFiltersSchema.parse({});

  const [rows, categories, timeZone, defaultCurrency] = await Promise.all([
    listSubscriptions(workspaceId, filters),
    listCategories(workspaceId),
    getUserTimezone(userId),
    getWorkspaceCurrency(workspaceId),
  ]);

  return (
    <SubscriptionsView
      rows={rows}
      categories={categories}
      filters={filters}
      openNew={params.new === "1"}
      timeZone={timeZone}
      defaultCurrency={defaultCurrency}
    />
  );
}
