"use server";

import { revalidatePath } from "next/cache";
import { regenerateInsights } from "@/features/insights";
import { err, ok, GENERIC_ERROR, type ActionResult } from "@/lib/errors";
import { AuthzError, requireWorkspace } from "@/server/authz";
import { rateLimit } from "@/server/rate-limit";
import {
  createSubscriptionSchema,
  subscriptionIdSchema,
  subscriptionIdsSchema,
  toggleFavoriteSchema,
  updateSubscriptionSchema,
} from "./schemas";
import {
  archiveSubscriptions,
  createSubscription,
  deleteSubscriptions,
  duplicateSubscription,
  NotFoundError,
  restoreSubscriptions,
  setFavorite,
  updateSubscription,
} from "./service";

const MUTATION_LIMIT = { limit: 60, windowMs: 60_000 };

/**
 * Shared action pipeline: authorize → rate limit → validated work →
 * revalidate. Every subscription mutation flows through here so no path
 * can skip a step.
 */
async function runMutation<T>(
  work: (workspaceId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const { userId, workspaceId } = await requireWorkspace();
    const limited = rateLimit(`mutation:${userId}`, MUTATION_LIMIT);
    if (!limited.ok) {
      return err("Too many changes at once. Wait a moment and retry.");
    }
    const data = await work(workspaceId);
    // Best-effort: insights are derived data — a regeneration failure must
    // never fail the user's mutation (the nightly job catches up).
    try {
      await regenerateInsights(workspaceId);
    } catch (error) {
      console.error("[insights] regeneration failed:", error);
    }
    revalidatePath("/subscriptions");
    revalidatePath("/dashboard");
    revalidatePath("/insights");
    return ok(data);
  } catch (error) {
    if (error instanceof AuthzError) return err("Not authorized");
    if (error instanceof NotFoundError) return err("Subscription not found");
    console.error("[subscriptions] mutation failed:", error);
    return err(GENERIC_ERROR);
  }
}

export async function createSubscriptionAction(input: unknown) {
  const parsed = createSubscriptionSchema.safeParse(input);
  if (!parsed.success) return err("Check the highlighted fields");
  return runMutation(async (workspaceId) => {
    const row = await createSubscription(workspaceId, parsed.data);
    return { id: row.id };
  });
}

export async function updateSubscriptionAction(input: unknown) {
  const parsed = updateSubscriptionSchema.safeParse(input);
  if (!parsed.success) return err("Check the highlighted fields");
  return runMutation(async (workspaceId) => {
    const row = await updateSubscription(workspaceId, parsed.data);
    return { id: row.id };
  });
}

export async function archiveSubscriptionsAction(input: unknown) {
  const parsed = subscriptionIdsSchema.safeParse(input);
  if (!parsed.success) return err(GENERIC_ERROR);
  return runMutation(async (workspaceId) => {
    const count = await archiveSubscriptions(workspaceId, parsed.data.ids);
    return { count };
  });
}

export async function restoreSubscriptionsAction(input: unknown) {
  const parsed = subscriptionIdsSchema.safeParse(input);
  if (!parsed.success) return err(GENERIC_ERROR);
  return runMutation(async (workspaceId) => {
    const count = await restoreSubscriptions(workspaceId, parsed.data.ids);
    return { count };
  });
}

export async function deleteSubscriptionsAction(input: unknown) {
  const parsed = subscriptionIdsSchema.safeParse(input);
  if (!parsed.success) return err(GENERIC_ERROR);
  return runMutation(async (workspaceId) => {
    const count = await deleteSubscriptions(workspaceId, parsed.data.ids);
    return { count };
  });
}

export async function duplicateSubscriptionAction(input: unknown) {
  const parsed = subscriptionIdSchema.safeParse(input);
  if (!parsed.success) return err(GENERIC_ERROR);
  return runMutation(async (workspaceId) => {
    const row = await duplicateSubscription(workspaceId, parsed.data.id);
    return { id: row.id };
  });
}

export async function toggleFavoriteAction(input: unknown) {
  const parsed = toggleFavoriteSchema.safeParse(input);
  if (!parsed.success) return err(GENERIC_ERROR);
  return runMutation(async (workspaceId) => {
    await setFavorite(workspaceId, parsed.data.id, parsed.data.isFavorite);
    return { id: parsed.data.id };
  });
}
