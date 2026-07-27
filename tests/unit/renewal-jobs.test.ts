import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { BillingInterval, SubscriptionStatus } from "@/generated/prisma/enums";

const dbMock = vi.hoisted(() => ({
  subscription: { findMany: vi.fn(), update: vi.fn() },
  renewalReminder: { create: vi.fn() },
}));

const sendEmailMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ db: dbMock }));
vi.mock("@/lib/email", () => ({ sendEmail: sendEmailMock }));

import { runJob, type Job } from "@/lib/jobs";
import { recomputeStaleRenewals } from "@/features/subscriptions/service";
import {
  REMINDER_WINDOW_DAYS,
  sendDueRenewalReminders,
} from "@/features/subscriptions/reminders";

const NOW = new Date(Date.UTC(2026, 6, 25));
const DAY_MS = 24 * 60 * 60 * 1000;

function uniqueViolation() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint", {
    code: "P2002",
    clientVersion: "test",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("recomputeStaleRenewals", () => {
  it("only queries non-deleted rows whose nextRenewalAt has passed", async () => {
    dbMock.subscription.findMany.mockResolvedValue([]);
    await recomputeStaleRenewals(NOW);

    expect(dbMock.subscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null, nextRenewalAt: { lte: NOW } },
      }),
    );
    expect(dbMock.subscription.update).not.toHaveBeenCalled();
  });

  it("advances each stale row strictly past now and loops until clean", async () => {
    const stale = {
      id: "sub-1",
      anchorDate: new Date(Date.UTC(2026, 0, 15)),
      interval: BillingInterval.MONTH,
      intervalCount: 1,
    };
    dbMock.subscription.findMany
      .mockResolvedValueOnce([stale])
      .mockResolvedValueOnce([]);
    dbMock.subscription.update.mockResolvedValue({});

    const count = await recomputeStaleRenewals(NOW);

    expect(count).toBe(1);
    expect(dbMock.subscription.findMany).toHaveBeenCalledTimes(2);
    const args = dbMock.subscription.update.mock.calls[0]?.[0];
    expect(args.where.id).toBe("sub-1");
    expect(args.data.nextRenewalAt.getTime()).toBeGreaterThan(NOW.getTime());
    // Anchor day-of-month preserved (Jan 15 anchor → Aug 15 next).
    expect(args.data.nextRenewalAt.getUTCDate()).toBe(15);
  });
});

describe("sendDueRenewalReminders", () => {
  const candidate = {
    id: "sub-1",
    workspaceId: "ws-1",
    name: "Netflix",
    amountMinor: 1549,
    currency: "USD",
    interval: BillingInterval.MONTH,
    intervalCount: 1,
    nextRenewalAt: new Date(NOW.getTime() + 2 * DAY_MS),
    workspace: { members: [{ user: { email: "user@example.com" } }] },
  };

  it("filters to billing subscriptions renewing inside the window", async () => {
    dbMock.subscription.findMany.mockResolvedValue([]);
    await sendDueRenewalReminders(NOW);

    const where = dbMock.subscription.findMany.mock.calls[0]?.[0]?.where;
    expect(where.deletedAt).toBeNull();
    expect(where.status.in).toEqual([
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIAL,
    ]);
    expect(where.nextRenewalAt).toEqual({
      gt: NOW,
      lte: new Date(NOW.getTime() + REMINDER_WINDOW_DAYS * DAY_MS),
    });
  });

  it("claims the ledger row before sending, with amount + date in the email", async () => {
    dbMock.subscription.findMany.mockResolvedValue([candidate]);
    dbMock.renewalReminder.create.mockResolvedValue({});
    sendEmailMock.mockResolvedValue(undefined);

    const result = await sendDueRenewalReminders(NOW);

    expect(result).toEqual({ sent: 1, skipped: 0 });
    // At-most-once: ledger insert strictly precedes the email.
    expect(
      dbMock.renewalReminder.create.mock.invocationCallOrder[0],
    ).toBeLessThan(sendEmailMock.mock.invocationCallOrder[0]!);
    expect(dbMock.renewalReminder.create).toHaveBeenCalledWith({
      data: {
        workspaceId: "ws-1",
        subscriptionId: "sub-1",
        renewalAt: candidate.nextRenewalAt,
      },
    });
    const message = sendEmailMock.mock.calls[0]?.[0];
    expect(message.to).toBe("user@example.com");
    expect(message.subject).toBe("Netflix renews Jul 27 — $15.49");
    expect(message.text).toContain("$15.49/mo");
  });

  it("skips already-reminded occurrences without emailing, and continues", async () => {
    const second = {
      ...candidate,
      id: "sub-2",
      name: "Figma",
      amountMinor: 1500,
    };
    dbMock.subscription.findMany.mockResolvedValue([candidate, second]);
    dbMock.renewalReminder.create
      .mockRejectedValueOnce(uniqueViolation())
      .mockResolvedValueOnce({});
    sendEmailMock.mockResolvedValue(undefined);

    const result = await sendDueRenewalReminders(NOW);

    expect(result).toEqual({ sent: 1, skipped: 1 });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0]?.[0].subject).toContain("Figma");
  });

  it("propagates non-unique-violation ledger errors", async () => {
    dbMock.subscription.findMany.mockResolvedValue([candidate]);
    dbMock.renewalReminder.create.mockRejectedValue(new Error("db down"));

    await expect(sendDueRenewalReminders(NOW)).rejects.toThrow("db down");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("skips subscriptions whose workspace has no member email", async () => {
    dbMock.subscription.findMany.mockResolvedValue([
      { ...candidate, workspace: { members: [] } },
    ]);
    const result = await sendDueRenewalReminders(NOW);
    expect(result).toEqual({ sent: 0, skipped: 0 });
    expect(dbMock.renewalReminder.create).not.toHaveBeenCalled();
  });
});

describe("runJob", () => {
  it("returns the job's result and never throws on failure", async () => {
    const throwing: Job = {
      name: "exploding",
      run: async () => {
        throw new Error("boom");
      },
    };
    const result = await runJob(throwing, NOW);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("boom");
    expect(result.counts).toEqual({});
  });

  it("passes the clock through to the job", async () => {
    const run = vi.fn().mockResolvedValue({ ok: true, counts: { x: 1 } });
    const result = await runJob({ name: "noop", run }, NOW);
    expect(run).toHaveBeenCalledWith(NOW);
    expect(result).toEqual({ ok: true, counts: { x: 1 } });
  });
});
