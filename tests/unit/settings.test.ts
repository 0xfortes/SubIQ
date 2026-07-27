import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  user: { update: vi.fn() },
  workspace: { update: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));

import {
  updateCurrencySchema,
  updateTimezoneSchema,
} from "@/features/settings/schemas";
import {
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
