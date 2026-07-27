import { cache } from "react";
import { db } from "@/lib/db";
import { monthlyEquivalentMinor } from "@/lib/money";
import type { Prisma } from "@/generated/prisma/client";
import { SubscriptionStatus } from "@/generated/prisma/enums";
import type { ListFilters } from "./schemas";

/**
 * Data access for subscriptions. Every query filters by workspaceId and
 * excludes soft-deleted rows unless explicitly asked otherwise.
 */

const STATUS_FILTER_MAP: Record<string, SubscriptionStatus | undefined> = {
  all: undefined,
  active: SubscriptionStatus.ACTIVE,
  trial: SubscriptionStatus.TRIAL,
  paused: SubscriptionStatus.PAUSED,
};

export type SubscriptionRow = Prisma.SubscriptionGetPayload<{
  include: {
    category: { select: { id: true; name: true; slug: true; color: true } };
  };
}>;

export async function listSubscriptions(
  workspaceId: string,
  filters: ListFilters,
): Promise<SubscriptionRow[]> {
  const rows = await db.subscription.findMany({
    where: {
      workspaceId,
      // "archived" flips the soft-delete filter; every other value keeps
      // the default live view and optionally narrows by status.
      deletedAt: filters.status === "archived" ? { not: null } : null,
      ...(STATUS_FILTER_MAP[filters.status] && {
        status: STATUS_FILTER_MAP[filters.status],
      }),
      ...(filters.category && {
        category: { slug: filters.category, deletedAt: null },
      }),
      ...(filters.q && {
        OR: [
          { name: { contains: filters.q, mode: "insensitive" } },
          { vendor: { contains: filters.q, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      category: { select: { id: true, name: true, slug: true, color: true } },
    },
    orderBy:
      filters.sort === "name"
        ? [{ name: "asc" }]
        : [{ nextRenewalAt: "asc" }, { name: "asc" }],
  });

  // Cost sorting uses the monthly equivalent, which lives in JS by design
  // (lib/money is the single home of that math). Personal-scale lists —
  // sorting in memory is fine and honest.
  if (filters.sort === "cost") {
    rows.sort(
      (a, b) =>
        monthlyEquivalentMinor(b.amountMinor, b.interval, b.intervalCount) -
        monthlyEquivalentMinor(a.amountMinor, a.interval, a.intervalCount),
    );
  }
  return rows;
}

/** Request-cached: the app layout (command palette) and pages share it. */
export const listCategories = cache(async (workspaceId: string) => {
  return db.category.findMany({
    where: { workspaceId, deletedAt: null },
    select: { id: true, name: true, slug: true, color: true },
    orderBy: { name: "asc" },
  });
});
