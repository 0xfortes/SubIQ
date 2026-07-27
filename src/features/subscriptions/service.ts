import { db } from "@/lib/db";
import { computeNextRenewalAt } from "@/lib/recurrence";
import type {
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
} from "./schemas";

/**
 * Business logic for subscriptions. Every function is workspace-scoped:
 * ownership is enforced by filtering on workspaceId, never assumed.
 * nextRenewalAt is recomputed on every write that can affect it.
 */

export class NotFoundError extends Error {
  constructor(message = "Subscription not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

function emptyToNull(value: string | undefined): string | null {
  return value ? value : null;
}

export async function createSubscription(
  workspaceId: string,
  input: CreateSubscriptionInput,
) {
  return db.subscription.create({
    data: {
      workspaceId,
      categoryId: input.categoryId ?? null,
      name: input.name,
      vendor: emptyToNull(input.vendor),
      url: emptyToNull(input.url),
      notes: emptyToNull(input.notes),
      color: input.color ?? null,
      amountMinor: input.amountMinor,
      currency: input.currency,
      interval: input.interval,
      intervalCount: input.intervalCount,
      anchorDate: input.anchorDate,
      nextRenewalAt: computeNextRenewalAt(
        input.anchorDate,
        input.interval,
        input.intervalCount,
        new Date(),
      ),
      status: input.status,
      trialEndsAt: input.trialEndsAt ?? null,
    },
  });
}

export async function updateSubscription(
  workspaceId: string,
  input: UpdateSubscriptionInput,
) {
  const { id, ...changes } = input;
  const existing = await db.subscription.findFirst({
    where: { id, workspaceId, deletedAt: null },
  });
  if (!existing) throw new NotFoundError();

  const anchorDate = changes.anchorDate ?? existing.anchorDate;
  const interval = changes.interval ?? existing.interval;
  const intervalCount = changes.intervalCount ?? existing.intervalCount;

  return db.subscription.update({
    where: { id: existing.id },
    data: {
      ...(changes.name !== undefined && { name: changes.name }),
      ...(changes.vendor !== undefined && {
        vendor: emptyToNull(changes.vendor),
      }),
      ...(changes.url !== undefined && { url: emptyToNull(changes.url) }),
      ...(changes.notes !== undefined && { notes: emptyToNull(changes.notes) }),
      ...(changes.color !== undefined && { color: changes.color }),
      ...(changes.categoryId !== undefined && {
        categoryId: changes.categoryId,
      }),
      ...(changes.amountMinor !== undefined && {
        amountMinor: changes.amountMinor,
      }),
      ...(changes.currency !== undefined && { currency: changes.currency }),
      ...(changes.status !== undefined && { status: changes.status }),
      ...(changes.trialEndsAt !== undefined && {
        trialEndsAt: changes.trialEndsAt,
      }),
      interval,
      intervalCount,
      anchorDate,
      nextRenewalAt: computeNextRenewalAt(
        anchorDate,
        interval,
        intervalCount,
        new Date(),
      ),
    },
  });
}

/** Archive = soft delete. Handles single and bulk (same invariant). */
export async function archiveSubscriptions(workspaceId: string, ids: string[]) {
  const result = await db.subscription.updateMany({
    where: { id: { in: ids }, workspaceId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return result.count;
}

export async function restoreSubscriptions(workspaceId: string, ids: string[]) {
  const result = await db.subscription.updateMany({
    where: { id: { in: ids }, workspaceId, deletedAt: { not: null } },
    data: { deletedAt: null },
  });
  return result.count;
}

export async function duplicateSubscription(workspaceId: string, id: string) {
  const existing = await db.subscription.findFirst({
    where: { id, workspaceId, deletedAt: null },
  });
  if (!existing) throw new NotFoundError();

  return db.subscription.create({
    data: {
      workspaceId,
      categoryId: existing.categoryId,
      name: `Copy of ${existing.name}`,
      vendor: existing.vendor,
      url: existing.url,
      notes: existing.notes,
      color: existing.color,
      isFavorite: false,
      amountMinor: existing.amountMinor,
      currency: existing.currency,
      interval: existing.interval,
      intervalCount: existing.intervalCount,
      anchorDate: existing.anchorDate,
      nextRenewalAt: computeNextRenewalAt(
        existing.anchorDate,
        existing.interval,
        existing.intervalCount,
        new Date(),
      ),
      status: existing.status,
      trialEndsAt: existing.trialEndsAt,
    },
  });
}

const RECOMPUTE_BATCH = 200;

/**
 * Advance every stale denormalized nextRenewalAt (nightly job step).
 * All statuses: it's a display column, and paused subs shouldn't show
 * past dates. Each update moves the row strictly past `now`, so looping
 * until the filter is empty terminates without cursors.
 *
 * Accepted v1 debt: the filter scans without a bare nextRenewalAt index
 * — trivial at personal scale, add the index when it isn't.
 */
export async function recomputeStaleRenewals(now = new Date()) {
  let recomputed = 0;
  for (;;) {
    const stale = await db.subscription.findMany({
      where: { deletedAt: null, nextRenewalAt: { lte: now } },
      select: {
        id: true,
        anchorDate: true,
        interval: true,
        intervalCount: true,
      },
      orderBy: { id: "asc" },
      take: RECOMPUTE_BATCH,
    });
    if (stale.length === 0) return recomputed;
    for (const sub of stale) {
      await db.subscription.update({
        where: { id: sub.id },
        data: {
          nextRenewalAt: computeNextRenewalAt(
            sub.anchorDate,
            sub.interval,
            sub.intervalCount,
            now,
          ),
        },
      });
      recomputed += 1;
    }
  }
}

export async function setFavorite(
  workspaceId: string,
  id: string,
  isFavorite: boolean,
) {
  const result = await db.subscription.updateMany({
    where: { id, workspaceId, deletedAt: null },
    data: { isFavorite },
  });
  if (result.count === 0) throw new NotFoundError();
}
