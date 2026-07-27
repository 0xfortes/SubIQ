import { beforeEach, describe, expect, it, vi } from "vitest";
import { BillingInterval, SubscriptionStatus } from "@/generated/prisma/enums";

const dbMock = vi.hoisted(() => ({
  workspace: { findUniqueOrThrow: vi.fn() },
  subscription: { findMany: vi.fn() },
  aiInsight: { upsert: vi.fn(), deleteMany: vi.fn() },
  // Array-form transaction: operations are already-started promises from
  // the mocked model methods; just await them all.
  $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));

import { regenerateInsights } from "@/features/insights/service";

const WORKSPACE = "11111111-1111-7111-8111-111111111111";

function entertainmentPair() {
  return [
    {
      id: "sub-a",
      name: "Netflix",
      amountMinor: 1549,
      currency: "USD",
      interval: BillingInterval.MONTH,
      intervalCount: 1,
      status: SubscriptionStatus.ACTIVE,
      trialEndsAt: null,
      category: { id: "cat-ent", name: "Entertainment" },
    },
    {
      id: "sub-b",
      name: "Spotify",
      amountMinor: 1099,
      currency: "USD",
      interval: BillingInterval.MONTH,
      intervalCount: 1,
      status: SubscriptionStatus.ACTIVE,
      trialEndsAt: null,
      category: { id: "cat-ent", name: "Entertainment" },
    },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.workspace.findUniqueOrThrow.mockResolvedValue({
    defaultCurrency: "USD",
  });
  dbMock.aiInsight.upsert.mockResolvedValue({});
  dbMock.aiInsight.deleteMany.mockResolvedValue({ count: 0 });
});

describe("regenerateInsights", () => {
  it("never touches status or dismissedAt in the upsert update branch", async () => {
    dbMock.subscription.findMany.mockResolvedValue(entertainmentPair());
    await regenerateInsights(WORKSPACE);

    expect(dbMock.aiInsight.upsert).toHaveBeenCalled();
    for (const call of dbMock.aiInsight.upsert.mock.calls) {
      const args = call[0];
      // The dismissed-must-not-resurrect guarantee.
      expect(args.update).not.toHaveProperty("status");
      expect(args.update).not.toHaveProperty("dismissedAt");
      // Create branch starts ACTIVE by schema default — also untouched.
      expect(args.create).not.toHaveProperty("status");
    }
  });

  it("upserts on the workspace + dedupeKey identity", async () => {
    dbMock.subscription.findMany.mockResolvedValue(entertainmentPair());
    await regenerateInsights(WORKSPACE);

    const keys = dbMock.aiInsight.upsert.mock.calls.map(
      (call) => call[0].where.workspaceId_dedupeKey,
    );
    expect(keys).toContainEqual({
      workspaceId: WORKSPACE,
      dedupeKey: "duplicate:cat-ent",
    });
    // The pair also yields two annual-switch candidates.
    expect(keys.map((k) => k.dedupeKey).sort()).toEqual([
      "annual:sub-a",
      "annual:sub-b",
      "duplicate:cat-ent",
    ]);
  });

  it("prunes exactly the rows whose dedupeKey was not regenerated", async () => {
    dbMock.subscription.findMany.mockResolvedValue(entertainmentPair());
    dbMock.aiInsight.deleteMany.mockResolvedValue({ count: 2 });

    const result = await regenerateInsights(WORKSPACE);

    const deleteArgs = dbMock.aiInsight.deleteMany.mock.calls[0]?.[0];
    expect(deleteArgs.where.workspaceId).toBe(WORKSPACE);
    expect(deleteArgs.where.dedupeKey.notIn.sort()).toEqual([
      "annual:sub-a",
      "annual:sub-b",
      "duplicate:cat-ent",
    ]);
    expect(result).toEqual({ upserted: 3, removed: 2 });
  });

  it("prunes everything for a workspace with no findings", async () => {
    dbMock.subscription.findMany.mockResolvedValue([]);
    dbMock.aiInsight.deleteMany.mockResolvedValue({ count: 4 });

    const result = await regenerateInsights(WORKSPACE);

    expect(dbMock.aiInsight.upsert).not.toHaveBeenCalled();
    const deleteArgs = dbMock.aiInsight.deleteMany.mock.calls[0]?.[0];
    expect(deleteArgs.where.dedupeKey.notIn).toEqual([]);
    expect(result).toEqual({ upserted: 0, removed: 4 });
  });

  it("only reads non-deleted subscriptions", async () => {
    dbMock.subscription.findMany.mockResolvedValue([]);
    await regenerateInsights(WORKSPACE);

    expect(dbMock.subscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: WORKSPACE, deletedAt: null },
      }),
    );
  });
});
