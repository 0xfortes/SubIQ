import { Prisma } from "@/generated/prisma/client";
import { SubscriptionStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formatDay } from "@/lib/dates";
import { sendEmail } from "@/lib/email";
import { formatMoney } from "@/lib/money";
import { cycleSuffix } from "@/lib/recurrence";

/**
 * Renewal reminder emails (nightly job step). Idempotency is the
 * RenewalReminder ledger's @@unique([subscriptionId, renewalAt]).
 *
 * Delivery policy: AT-MOST-ONCE. The ledger row is claimed BEFORE the
 * email is sent — if the process dies between the two, one reminder is
 * lost rather than risking a duplicate on every retry. For a reminder
 * product, spam is worse than a rare miss; the next occurrence gets its
 * own row.
 *
 * Recipient: the workspace's first member (v1 = one personal workspace
 * per user). Multi-member workspaces will need a recipient policy —
 * design-for item, not built.
 */

export const REMINDER_WINDOW_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function sendDueRenewalReminders(
  now = new Date(),
): Promise<{ sent: number; skipped: number }> {
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_DAYS * DAY_MS);
  const candidates = await db.subscription.findMany({
    where: {
      deletedAt: null,
      status: {
        in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL],
      },
      nextRenewalAt: { gt: now, lte: windowEnd },
    },
    select: {
      id: true,
      workspaceId: true,
      name: true,
      amountMinor: true,
      currency: true,
      interval: true,
      intervalCount: true,
      nextRenewalAt: true,
      workspace: {
        select: {
          members: {
            select: { user: { select: { email: true } } },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  let sent = 0;
  let skipped = 0;
  for (const sub of candidates) {
    const email = sub.workspace.members[0]?.user.email;
    if (!email) continue;

    try {
      await db.renewalReminder.create({
        data: {
          workspaceId: sub.workspaceId,
          subscriptionId: sub.id,
          renewalAt: sub.nextRenewalAt,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        skipped += 1;
        continue;
      }
      throw error;
    }

    const amount = formatMoney(sub.amountMinor, sub.currency);
    const day = formatDay(sub.nextRenewalAt, now);
    await sendEmail({
      to: email,
      subject: `${sub.name} renews ${day} — ${amount}`,
      text: [
        `${sub.name} renews on ${day}.`,
        "",
        `Amount: ${amount}${cycleSuffix(sub.interval, sub.intervalCount)}`,
        "",
        "Still using it? Cancel or keep — your call, made in time.",
      ].join("\n"),
    });
    sent += 1;
  }
  return { sent, skipped };
}
