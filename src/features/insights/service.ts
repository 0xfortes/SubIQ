import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { computeInsights } from "./rules";

/**
 * Regenerate a workspace's insights from current subscription state.
 * Idempotent: candidates upsert on (workspaceId, dedupeKey); stale rows
 * are deleted (insights are regenerable derived data — nothing to keep).
 *
 * Dismissal safety: the upsert's update branch never touches status or
 * dismissedAt, so a dismissed insight keeps a fresh payload but stays
 * DISMISSED until its condition disappears entirely.
 */
export async function regenerateInsights(
  workspaceId: string,
  now = new Date(),
): Promise<{ upserted: number; removed: number }> {
  const [workspace, subscriptions] = await Promise.all([
    db.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { defaultCurrency: true },
    }),
    db.subscription.findMany({
      where: { workspaceId, deletedAt: null },
      select: {
        id: true,
        name: true,
        amountMinor: true,
        currency: true,
        interval: true,
        intervalCount: true,
        status: true,
        trialEndsAt: true,
        category: { select: { id: true, name: true } },
      },
    }),
  ]);

  const candidates = computeInsights({
    subscriptions,
    defaultCurrency: workspace.defaultCurrency,
    now,
  });

  const results = await db.$transaction([
    ...candidates.map((candidate) =>
      db.aiInsight.upsert({
        where: {
          workspaceId_dedupeKey: {
            workspaceId,
            dedupeKey: candidate.dedupeKey,
          },
        },
        create: {
          workspaceId,
          type: candidate.type,
          title: candidate.title,
          body: candidate.body,
          savingsMinor: candidate.savingsMinor,
          currency: candidate.currency,
          subscriptionIds: candidate.subscriptionIds,
          dedupeKey: candidate.dedupeKey,
          data: candidate.data as Prisma.InputJsonValue,
        },
        update: {
          title: candidate.title,
          body: candidate.body,
          savingsMinor: candidate.savingsMinor,
          currency: candidate.currency,
          subscriptionIds: candidate.subscriptionIds,
          data: candidate.data as Prisma.InputJsonValue,
        },
      }),
    ),
    db.aiInsight.deleteMany({
      where: {
        workspaceId,
        dedupeKey: { notIn: candidates.map((c) => c.dedupeKey) },
      },
    }),
  ]);

  const removed = (results[results.length - 1] as { count: number }).count;
  return { upserted: candidates.length, removed };
}

/**
 * Regenerate insights for every workspace with subscriptions (nightly job
 * step — the time-based backstop TRIAL_ENDING needs). Sequential on
 * purpose: bounded DB pressure; one bad workspace never kills the run.
 */
export async function regenerateAllInsights(
  now = new Date(),
): Promise<{ regenerated: number; failed: number }> {
  const workspaces = await db.subscription.findMany({
    where: { deletedAt: null },
    distinct: ["workspaceId"],
    select: { workspaceId: true },
  });

  let regenerated = 0;
  let failed = 0;
  for (const { workspaceId } of workspaces) {
    try {
      await regenerateInsights(workspaceId, now);
      regenerated += 1;
    } catch (error) {
      failed += 1;
      // Workspace id only — no user data in logs.
      console.error(
        `[insights] regeneration failed for workspace ${workspaceId}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
  return { regenerated, failed };
}
