import { beforeEach, describe, expect, it, vi } from "vitest";
import { BillingInterval, SubscriptionStatus } from "@/generated/prisma/enums";

const dbMock = vi.hoisted(() => ({
  subscription: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));

import {
  archiveSubscriptions,
  createSubscription,
  duplicateSubscription,
  NotFoundError,
  setFavorite,
  updateSubscription,
} from "@/features/subscriptions/service";

const WORKSPACE = "11111111-1111-7111-8111-111111111111";
const SUB_ID = "22222222-2222-7222-8222-222222222222";

const baseInput = {
  name: "Netflix",
  amountMinor: 1549,
  currency: "USD",
  interval: BillingInterval.MONTH,
  intervalCount: 1,
  anchorDate: new Date(Date.UTC(2026, 0, 15)),
  status: SubscriptionStatus.ACTIVE,
};

const existingRow = {
  id: SUB_ID,
  workspaceId: WORKSPACE,
  categoryId: null,
  name: "Netflix",
  vendor: null,
  url: null,
  notes: null,
  color: null,
  isFavorite: false,
  amountMinor: 1549,
  currency: "USD",
  interval: BillingInterval.MONTH,
  intervalCount: 1,
  anchorDate: new Date(Date.UTC(2026, 0, 15)),
  nextRenewalAt: new Date(Date.UTC(2026, 7, 15)),
  status: SubscriptionStatus.ACTIVE,
  trialEndsAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSubscription", () => {
  it("stamps workspaceId and computes nextRenewalAt", async () => {
    dbMock.subscription.create.mockResolvedValue({ id: SUB_ID });
    await createSubscription(WORKSPACE, baseInput);

    const data = dbMock.subscription.create.mock.calls[0]?.[0]?.data;
    expect(data.workspaceId).toBe(WORKSPACE);
    expect(data.nextRenewalAt).toBeInstanceOf(Date);
    expect(data.nextRenewalAt.getTime()).toBeGreaterThan(Date.now());
    // Renewal preserves the anchor's day-of-month.
    expect(data.nextRenewalAt.getUTCDate()).toBe(15);
  });
});

describe("updateSubscription", () => {
  it("recomputes nextRenewalAt from merged recurrence fields", async () => {
    dbMock.subscription.findFirst.mockResolvedValue(existingRow);
    dbMock.subscription.update.mockResolvedValue(existingRow);

    await updateSubscription(WORKSPACE, {
      id: SUB_ID,
      interval: BillingInterval.YEAR,
    });

    const args = dbMock.subscription.update.mock.calls[0]?.[0];
    expect(args.data.interval).toBe(BillingInterval.YEAR);
    // Yearly from Jan 15 anchor → next occurrence is a Jan 15.
    expect(args.data.nextRenewalAt.getUTCMonth()).toBe(0);
    expect(args.data.nextRenewalAt.getUTCDate()).toBe(15);
  });

  it("scopes the lookup to the workspace and throws when missing", async () => {
    dbMock.subscription.findFirst.mockResolvedValue(null);
    await expect(
      updateSubscription("other-workspace", { id: SUB_ID, name: "X" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(dbMock.subscription.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspaceId: "other-workspace",
          deletedAt: null,
        }),
      }),
    );
    expect(dbMock.subscription.update).not.toHaveBeenCalled();
  });
});

describe("archiveSubscriptions", () => {
  it("soft-deletes only workspace-owned, non-archived rows", async () => {
    dbMock.subscription.updateMany.mockResolvedValue({ count: 2 });
    const count = await archiveSubscriptions(WORKSPACE, [SUB_ID, "other"]);
    expect(count).toBe(2);

    const args = dbMock.subscription.updateMany.mock.calls[0]?.[0];
    expect(args.where.workspaceId).toBe(WORKSPACE);
    expect(args.where.deletedAt).toBeNull();
    expect(args.data.deletedAt).toBeInstanceOf(Date);
  });
});

describe("duplicateSubscription", () => {
  it("copies the row with a new name and no favorite flag", async () => {
    dbMock.subscription.findFirst.mockResolvedValue({
      ...existingRow,
      isFavorite: true,
    });
    dbMock.subscription.create.mockResolvedValue({ id: "new-id" });

    await duplicateSubscription(WORKSPACE, SUB_ID);

    const data = dbMock.subscription.create.mock.calls[0]?.[0]?.data;
    expect(data.name).toBe("Copy of Netflix");
    expect(data.isFavorite).toBe(false);
    expect(data.workspaceId).toBe(WORKSPACE);
  });
});

describe("setFavorite", () => {
  it("throws NotFoundError when no row matches the workspace", async () => {
    dbMock.subscription.updateMany.mockResolvedValue({ count: 0 });
    await expect(setFavorite(WORKSPACE, SUB_ID, true)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
