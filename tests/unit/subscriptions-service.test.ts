import { beforeEach, describe, expect, it, vi } from "vitest";
import { BillingInterval, SubscriptionStatus } from "@/generated/prisma/enums";

const dbMock = vi.hoisted(() => {
  const client = {
    subscription: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    category: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    // Creating a subscription and its category is one atomic unit; the mock
    // hands the callback the same client so assertions stay flat.
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(client)),
  };
  return client;
});

vi.mock("@/lib/db", () => ({ db: dbMock }));

import {
  archiveSubscriptions,
  createSubscription,
  deleteSubscriptions,
  duplicateSubscription,
  NotFoundError,
  setFavorite,
  updateSubscription,
  ValidationError,
} from "@/features/subscriptions/service";
import { createSubscriptionSchema } from "@/features/subscriptions/schemas";

const WORKSPACE = "11111111-1111-7111-8111-111111111111";
const SUB_ID = "22222222-2222-7222-8222-222222222222";

const baseInput = {
  name: "Netflix",
  amountMinor: 1549,
  currency: "USD" as const,
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

describe("categoryName validation", () => {
  function parse(categoryName: string) {
    return createSubscriptionSchema.safeParse({ ...baseInput, categoryName });
  }

  it("normalizes whitespace and keeps a legible name", () => {
    const parsed = parse("  Streaming   Extras  ");
    expect(parsed.success).toBe(true);
    if (parsed.success)
      expect(parsed.data.categoryName).toBe("Streaming Extras");
  });

  it("accepts non-Latin scripts and the safe punctuation set", () => {
    for (const name of ["音楽", "Dev & Infra", "Kids' TV", "Health/Fitness"]) {
      expect(parse(name).success).toBe(true);
    }
  });

  it("rejects markup, control characters and bidi overrides", () => {
    for (const name of [
      "<script>alert(1)</script>",
      "Streaming\u0000",
      "Media\u202Egnimaerts",
      '"quoted"',
      "back\\slash",
    ]) {
      expect(parse(name).success).toBe(false);
    }
  });

  it("rejects empty, punctuation-only, and over-long names", () => {
    expect(parse("   ").success).toBe(false);
    expect(parse("!!!").success).toBe(false);
    expect(parse("-leading").success).toBe(false);
    expect(parse("a".repeat(41)).success).toBe(false);
  });

  it("rejects naming a category AND picking one", () => {
    const parsed = createSubscriptionSchema.safeParse({
      ...baseInput,
      categoryId: "33333333-3333-7333-8333-333333333333",
      categoryName: "Streaming",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("category resolution", () => {
  const CATEGORY_ID = "33333333-3333-7333-8333-333333333333";

  it("rejects a categoryId belonging to another workspace", async () => {
    dbMock.category.findFirst.mockResolvedValue(null);
    await expect(
      createSubscription(WORKSPACE, { ...baseInput, categoryId: CATEGORY_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(dbMock.category.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId: WORKSPACE }),
      }),
    );
    expect(dbMock.subscription.create).not.toHaveBeenCalled();
  });

  it("creates a named category with a slug and a palette color", async () => {
    dbMock.category.findFirst.mockResolvedValue(null);
    dbMock.category.count.mockResolvedValue(6);
    dbMock.category.create.mockResolvedValue({ id: CATEGORY_ID });
    dbMock.subscription.create.mockResolvedValue({ id: SUB_ID });

    await createSubscription(WORKSPACE, {
      ...baseInput,
      categoryName: "Streaming Extras",
    });

    const data = dbMock.category.create.mock.calls[0]?.[0]?.data;
    expect(data).toMatchObject({
      workspaceId: WORKSPACE,
      name: "Streaming Extras",
      slug: "streaming-extras",
    });
    expect(data.color).toMatch(/^#[0-9A-F]{6}$/i);
    expect(dbMock.subscription.create.mock.calls[0]?.[0]?.data.categoryId).toBe(
      CATEGORY_ID,
    );
  });

  it("reuses an existing category instead of creating a near-duplicate", async () => {
    dbMock.category.findFirst.mockResolvedValue({
      id: CATEGORY_ID,
      deletedAt: null,
    });
    dbMock.subscription.create.mockResolvedValue({ id: SUB_ID });

    await createSubscription(WORKSPACE, {
      ...baseInput,
      categoryName: "Streaming Extras",
    });

    expect(dbMock.category.create).not.toHaveBeenCalled();
    expect(dbMock.subscription.create.mock.calls[0]?.[0]?.data.categoryId).toBe(
      CATEGORY_ID,
    );
  });

  it("revives an archived category rather than colliding on its slug", async () => {
    dbMock.category.findFirst.mockResolvedValue({
      id: CATEGORY_ID,
      deletedAt: new Date(),
    });
    dbMock.subscription.create.mockResolvedValue({ id: SUB_ID });

    await createSubscription(WORKSPACE, {
      ...baseInput,
      categoryName: "Streaming Extras",
    });

    expect(dbMock.category.update).toHaveBeenCalledWith({
      where: { id: CATEGORY_ID },
      data: { deletedAt: null },
    });
    expect(dbMock.category.create).not.toHaveBeenCalled();
  });

  it("caps how many categories one workspace can accumulate", async () => {
    dbMock.category.findFirst.mockResolvedValue(null);
    dbMock.category.count.mockResolvedValue(50);

    await expect(
      createSubscription(WORKSPACE, { ...baseInput, categoryName: "Extras" }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(dbMock.category.create).not.toHaveBeenCalled();
    expect(dbMock.subscription.create).not.toHaveBeenCalled();
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

describe("deleteSubscriptions", () => {
  it("hard-deletes workspace-owned rows regardless of archived state", async () => {
    dbMock.subscription.deleteMany.mockResolvedValue({ count: 2 });
    const count = await deleteSubscriptions(WORKSPACE, [SUB_ID, "other"]);
    expect(count).toBe(2);

    const args = dbMock.subscription.deleteMany.mock.calls[0]?.[0];
    expect(args.where.workspaceId).toBe(WORKSPACE);
    expect(args.where.id).toEqual({ in: [SUB_ID, "other"] });
    // No deletedAt filter — delete applies to live and archived rows alike.
    expect(args.where.deletedAt).toBeUndefined();
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
