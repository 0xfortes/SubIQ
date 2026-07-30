import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { regenerateAllInsights } from "@/features/insights";
import {
  recomputeStaleRenewals,
  sendDueRenewalReminders,
} from "@/features/subscriptions";
import { env } from "@/lib/env";
import { runJob, type Job } from "@/lib/jobs";
import { pruneExpiredSessions } from "@/lib/session";

/** Constant-time string compare (length-safe) for the bearer token. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Cron entry point (Vercel Cron sends GET with `Authorization: Bearer
 * <CRON_SECRET>` when the env var is set on the project). One dynamic
 * route so auth lives in one place; adding a job = one registry entry +
 * one vercel.json line.
 *
 * Accepted v1 debt: one invocation processes everything sequentially.
 * When scale outgrows the function timeout, the run functions move to
 * Inngest/BullMQ steps behind the same Job interface.
 */

export const maxDuration = 300;

const nightly: Job = {
  name: "nightly",
  async run(now) {
    const counts: Record<string, number> = {};

    counts.renewalsRecomputed = await recomputeStaleRenewals(now);

    const insights = await regenerateAllInsights(now);
    counts.workspacesRegenerated = insights.regenerated;
    counts.insightFailures = insights.failed;

    const reminders = await sendDueRenewalReminders(now);
    counts.remindersSent = reminders.sent;
    counts.remindersSkipped = reminders.skipped;

    counts.expiredSessionsPruned = await pruneExpiredSessions(now);

    return {
      ok: insights.failed === 0,
      counts,
      ...(insights.failed > 0
        ? { error: `${insights.failed} workspace insight regenerations failed` }
        : {}),
    };
  },
};

const jobs: Record<string, Job> = { nightly };

function authorized(request: NextRequest): boolean {
  if (env.CRON_SECRET) {
    const header = request.headers.get("authorization") ?? "";
    return safeEqual(header, `Bearer ${env.CRON_SECRET}`);
  }
  // The env schema requires CRON_SECRET in production; this branch only
  // exists so `curl localhost:3000/api/cron/nightly` works in dev.
  return env.NODE_ENV !== "production";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ job: string }> },
) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { job: jobName } = await params;
  const job = jobs[jobName];
  if (!job) {
    return NextResponse.json({ error: "Unknown job" }, { status: 404 });
  }

  const result = await runJob(job);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
