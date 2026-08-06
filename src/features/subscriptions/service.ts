import { fallbackColor } from "@/lib/colors";
import { db } from "@/lib/db";
import { computeNextRenewalAt } from "@/lib/recurrence";
import { categorySlug } from "@/lib/slug";
import type { Prisma } from "@/generated/prisma/client";
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

/** A rule the user can fix — its message is safe to show them verbatim. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Free-text category names would otherwise let one workspace grow rows
 * without bound. Well above any real personal setup (six are seeded).
 */
const MAX_CATEGORIES_PER_WORKSPACE = 50;

function emptyToNull(value: string | undefined): string | null {
  return value ? value : null;
}

/**
 * Find or create the category a user named via "Other". Reuses an existing
 * category with the same slug rather than creating a near-duplicate, so
 * "Streaming" and "streaming " converge on one row.
 */
async function findOrCreateCategory(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  name: string,
): Promise<string> {
  const slug = categorySlug(name);

  // @@unique([workspaceId, slug]) ignores deletedAt, so an archived category
  // must be revived — creating over it would violate the constraint.
  const existing = await tx.category.findFirst({
    where: { workspaceId, slug },
    select: { id: true, deletedAt: true },
  });
  if (existing) {
    if (existing.deletedAt) {
      await tx.category.update({
        where: { id: existing.id },
        data: { deletedAt: null },
      });
    }
    return existing.id;
  }

  const count = await tx.category.count({
    where: { workspaceId, deletedAt: null },
  });
  if (count >= MAX_CATEGORIES_PER_WORKSPACE) {
    throw new ValidationError(
      `You've reached the limit of ${MAX_CATEGORIES_PER_WORKSPACE} categories.`,
    );
  }

  // fallbackColor draws from the DESIGN.md category hue family and is
  // deterministic per name, so a category's color never shifts between runs.
  // A concurrent create of the same slug hits the unique constraint and rolls
  // the whole transaction back; the retry then finds the winner and reuses it.
  const created = await tx.category.create({
    data: { workspaceId, name, slug, color: fallbackColor(name) },
    select: { id: true },
  });
  return created.id;
}

/**
 * Resolve the client's category choice to an owned category id, or null.
 *
 * Never trust a client-supplied categoryId: verify it names a live category
 * in THIS workspace. Prevents a cross-tenant reference — and the category
 * name/color leak a joined read would then expose. A categoryName instead
 * creates (or reuses) a category inside this workspace, so the same
 * guarantee holds by construction.
 */
async function resolveCategory(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  choice: { categoryId?: string | null; categoryName?: string | null },
): Promise<string | null> {
  if (choice.categoryName) {
    return findOrCreateCategory(tx, workspaceId, choice.categoryName);
  }
  if (!choice.categoryId) return null;
  const category = await tx.category.findFirst({
    where: { id: choice.categoryId, workspaceId, deletedAt: null },
    select: { id: true },
  });
  if (!category) throw new NotFoundError("Category not found");
  return category.id;
}

// Category resolution can CREATE a row, so it shares the subscription's
// transaction — a failed insert must not leave an orphan category behind.
export async function createSubscription(
  workspaceId: string,
  input: CreateSubscriptionInput,
) {
  return db.$transaction(async (tx) => {
    const categoryId = await resolveCategory(tx, workspaceId, input);
    return tx.subscription.create({
      data: {
        workspaceId,
        categoryId,
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
  });
}

export async function updateSubscription(
  workspaceId: string,
  input: UpdateSubscriptionInput,
) {
  const { id, ...changes } = input;
  return db.$transaction(async (tx) => {
    const existing = await tx.subscription.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError();

    // Only touch the category when the client actually sent a choice —
    // and resolve it, so reassignment stays inside the workspace whether it
    // names an existing category or creates one.
    const categoryTouched =
      changes.categoryId !== undefined || changes.categoryName !== undefined;
    const categoryId = categoryTouched
      ? await resolveCategory(tx, workspaceId, changes)
      : undefined;

    const anchorDate = changes.anchorDate ?? existing.anchorDate;
    const interval = changes.interval ?? existing.interval;
    const intervalCount = changes.intervalCount ?? existing.intervalCount;

    return tx.subscription.update({
      where: { id: existing.id },
      data: {
        ...(changes.name !== undefined && { name: changes.name }),
        ...(changes.vendor !== undefined && {
          vendor: emptyToNull(changes.vendor),
        }),
        ...(changes.url !== undefined && { url: emptyToNull(changes.url) }),
        ...(changes.notes !== undefined && {
          notes: emptyToNull(changes.notes),
        }),
        ...(changes.color !== undefined && { color: changes.color }),
        ...(categoryId !== undefined && { categoryId }),
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

/**
 * Hard delete — permanent and irreversible (archive is the reversible path).
 * Workspace-scoped like every mutation. Any owned row can be deleted, archived
 * or not. RenewalReminder rows cascade in the DB (onDelete: Cascade);
 * AiInsight.subscriptionIds is loose, non-FK data that regenerateInsights
 * prunes after the delete.
 */
export async function deleteSubscriptions(workspaceId: string, ids: string[]) {
  const result = await db.subscription.deleteMany({
    where: { id: { in: ids }, workspaceId },
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
 * This cross-workspace scan is served by the bare @@index([nextRenewalAt])
 * on Subscription (no workspaceId predicate, so the composite indexes
 * don't apply).
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
