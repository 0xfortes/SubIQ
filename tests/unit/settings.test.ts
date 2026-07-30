import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  user: { update: vi.fn() },
  workspace: { update: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));

import {
  updateCurrencySchema,
  updateNameSchema,
  updateTimezoneSchema,
} from "@/features/settings/schemas";
import {
  updateUserName,
  updateUserTimezone,
  updateWorkspaceCurrency,
} from "@/features/settings/service";

const USER = "11111111-1111-7111-8111-111111111111";
const WORKSPACE = "22222222-2222-7222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateTimezoneSchema", () => {
  it("accepts valid IANA zones", () => {
    expect(
      updateTimezoneSchema.safeParse({ timezone: "America/New_York" }).success,
    ).toBe(true);
    expect(updateTimezoneSchema.safeParse({ timezone: "UTC" }).success).toBe(
      true,
    );
  });

  it("rejects invalid zones", () => {
    expect(
      updateTimezoneSchema.safeParse({ timezone: "America/Not_A_City" })
        .success,
    ).toBe(false);
    expect(updateTimezoneSchema.safeParse({ timezone: "" }).success).toBe(
      false,
    );
    expect(updateTimezoneSchema.safeParse({}).success).toBe(false);
  });
});

describe("updateCurrencySchema", () => {
  it("accepts supported currencies", () => {
    expect(updateCurrencySchema.safeParse({ currency: "EUR" }).success).toBe(
      true,
    );
  });

  it("rejects unsupported or malformed codes", () => {
    expect(updateCurrencySchema.safeParse({ currency: "XYZ" }).success).toBe(
      false,
    );
    expect(updateCurrencySchema.safeParse({ currency: "eur" }).success).toBe(
      false,
    );
    expect(updateCurrencySchema.safeParse({}).success).toBe(false);
  });
});

describe("updateNameSchema", () => {
  it("trims and keeps a non-empty name", () => {
    const parsed = updateNameSchema.safeParse({ name: "  Ada Lovelace  " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.name).toBe("Ada Lovelace");
  });

  it("normalizes empty / whitespace-only input to null (clears the name)", () => {
    for (const name of ["", "   "]) {
      const parsed = updateNameSchema.safeParse({ name });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.name).toBeNull();
    }
  });

  it("rejects names longer than 80 characters", () => {
    expect(updateNameSchema.safeParse({ name: "a".repeat(81) }).success).toBe(
      false,
    );
  });
});

describe("updateUserName", () => {
  it("updates only the name of the given user", async () => {
    dbMock.user.update.mockResolvedValue({ name: "Ada" });
    await updateUserName(USER, "Ada");
    expect(dbMock.user.update).toHaveBeenCalledWith({
      where: { id: USER },
      data: { name: "Ada" },
      select: { name: true },
    });
  });

  it("writes null to clear the name", async () => {
    dbMock.user.update.mockResolvedValue({ name: null });
    await updateUserName(USER, null);
    expect(dbMock.user.update).toHaveBeenCalledWith({
      where: { id: USER },
      data: { name: null },
      select: { name: true },
    });
  });
});

describe("updateUserTimezone", () => {
  it("updates only the timezone of the given user", async () => {
    dbMock.user.update.mockResolvedValue({ timezone: "Europe/Lisbon" });
    await updateUserTimezone(USER, "Europe/Lisbon");
    expect(dbMock.user.update).toHaveBeenCalledWith({
      where: { id: USER },
      data: { timezone: "Europe/Lisbon" },
      select: { timezone: true },
    });
  });
});

describe("updateWorkspaceCurrency", () => {
  it("updates only the default currency of the given workspace", async () => {
    dbMock.workspace.update.mockResolvedValue({ defaultCurrency: "EUR" });
    await updateWorkspaceCurrency(WORKSPACE, "EUR");
    expect(dbMock.workspace.update).toHaveBeenCalledWith({
      where: { id: WORKSPACE },
      data: { defaultCurrency: "EUR" },
      select: { defaultCurrency: true },
    });
  });
});
