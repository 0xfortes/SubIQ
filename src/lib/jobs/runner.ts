/**
 * Minimal background-job framework. Business logic lives in feature
 * modules (lib may not import features); route handlers compose the two.
 * Swapping to Inngest/BullMQ later re-hosts `Job.run` functions unchanged —
 * scheduling, retries, and queues deliberately do not exist here.
 */
import * as Sentry from "@sentry/nextjs";

export interface JobResult {
  ok: boolean;
  /** Step name → count, e.g. { renewalsRecomputed: 12, remindersSent: 3 }. */
  counts: Record<string, number>;
  error?: string;
}

export interface Job {
  name: string;
  run(now: Date): Promise<JobResult>;
}

/** Runs a job with timing + structured logs (no PII). Never throws. */
export async function runJob(job: Job, now = new Date()): Promise<JobResult> {
  const startedAt = Date.now();
  console.log(`[job:${job.name}] start`);
  try {
    const result = await job.run(now);
    const elapsed = Date.now() - startedAt;
    if (result.ok) {
      console.log(`[job:${job.name}] done in ${elapsed}ms`, result.counts);
    } else {
      console.error(
        `[job:${job.name}] finished with errors in ${elapsed}ms`,
        result.counts,
        result.error,
      );
    }
    return result;
  } catch (error) {
    const elapsed = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[job:${job.name}] failed in ${elapsed}ms: ${message}`);
    // runJob swallows the throw, so the Next.js onRequestError hook never sees
    // it — report cron failures to Sentry explicitly.
    Sentry.captureException(error, { tags: { job: job.name } });
    return { ok: false, counts: {}, error: message };
  }
}
