import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => {
  const client = {
    user: { update: vi.fn() },
    workspace: { update: vi.fn(), findUniqueOrThrow: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(client)),
  };
  return client;
});

vi.mock("@/lib/db", () => ({ db: dbMock }));

import { updateSettingsSchema } from "@/features/settings/schemas";
import { updateSettings } from "@/features/settings/service";

const USER = "11111111-1111-7111-8111-111111111111";
const WORKSPACE = "22222222-2222-7222-8222-222222222222";

const baseInput = { name: "Ada", timezone: "Europe/Lisbon", currency: "EUR" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateSettingsSchema", () => {
  it("accepts a full, valid form", () => {
    expect(updateSettingsSchema.safeParse(baseInput).success).toBe(true);
  });

  it("trims the name and normalizes empty input to null (clears it)", () => {
    const trimmed = updateSettingsSchema.safeParse({
      ...baseInput,
      name: "  Ada Lovelace  ",
    });
    expect(trimmed.success).toBe(true);
    if (trimmed.success) expect(trimmed.data.name).toBe("Ada Lovelace");

    for (const name of ["", "   "]) {
      const parsed = updateSettingsSchema.safeParse({ ...baseInput, name });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.name).toBeNull();
    }
  });

  it("rejects names longer than 80 characters", () => {
    expect(
      updateSettingsSchema.safeParse({ ...baseInput, name: "a".repeat(81) })
        .success,
    ).toBe(false);
  });

  it("rejects invalid timezones", () => {
    for (const timezone of ["America/Not_A_City", ""]) {
      expect(
        updateSettingsSchema.safeParse({ ...baseInput, timezone }).success,
      ).toBe(false);
    }
    expect(
      updateSettingsSchema.safeParse({ ...baseInput, timezone: "UTC" }).success,
    ).toBe(true);
  });

  it("rejects unsupported or malformed currency codes", () => {
    for (const currency of ["XYZ", "eur"]) {
      expect(
        updateSettingsSchema.safeParse({ ...baseInput, currency }).success,
      ).toBe(false);
    }
  });

  it("requires every field — a partial form is not a valid save", () => {
    expect(updateSettingsSchema.safeParse({ name: "Ada" }).success).toBe(false);
    expect(updateSettingsSchema.safeParse({}).success).toBe(false);
  });
});

describe("updateSettings", () => {
  function mockCurrentCurrency(defaultCurrency: string) {
    dbMock.workspace.findUniqueOrThrow.mockResolvedValue({ defaultCurrency });
  }

  it("writes the profile and the workspace in one transaction", async () => {
    mockCurrentCurrency("USD");
    dbMock.user.update.mockResolvedValue({
      name: "Ada",
      timezone: "Europe/Lisbon",
    });
    dbMock.workspace.update.mockResolvedValue({ defaultCurrency: "EUR" });

    const result = await updateSettings(USER, WORKSPACE, {
      name: "Ada",
      timezone: "Europe/Lisbon",
      currency: "EUR",
    });

    expect(dbMock.$transaction).toHaveBeenCalledTimes(1);
    expect(dbMock.user.update).toHaveBeenCalledWith({
      where: { id: USER },
      data: { name: "Ada", timezone: "Europe/Lisbon" },
      select: { name: true, timezone: true },
    });
    expect(dbMock.workspace.update).toHaveBeenCalledWith({
      where: { id: WORKSPACE },
      data: { defaultCurrency: "EUR" },
      select: { defaultCurrency: true },
    });
    expect(result).toMatchObject({
      name: "Ada",
      timezone: "Europe/Lisbon",
      defaultCurrency: "EUR",
      currencyChanged: true,
    });
  });

  it("reports currencyChanged from the stored row, not the client", async () => {
    mockCurrentCurrency("EUR");
    dbMock.user.update.mockResolvedValue({ name: null, timezone: "UTC" });
    dbMock.workspace.update.mockResolvedValue({ defaultCurrency: "EUR" });

    const result = await updateSettings(USER, WORKSPACE, {
      name: null,
      timezone: "UTC",
      currency: "EUR",
    });

    expect(result.currencyChanged).toBe(false);
    expect(result.name).toBeNull();
  });
});
