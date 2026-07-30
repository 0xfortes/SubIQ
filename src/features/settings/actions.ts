"use server";

import { revalidatePath } from "next/cache";
import { regenerateInsights } from "@/features/insights";
import { err, ok, GENERIC_ERROR, type ActionResult } from "@/lib/errors";
import { AuthzError, requireWorkspace } from "@/server/authz";
import { rateLimit } from "@/server/rate-limit";
import {
  updateCurrencySchema,
  updateNameSchema,
  updateTimezoneSchema,
} from "./schemas";
import {
  updateUserName,
  updateUserTimezone,
  updateWorkspaceCurrency,
} from "./service";

// Same key as subscription mutations: one shared per-user mutation budget.
const MUTATION_LIMIT = { limit: 60, windowMs: 60_000 };

/**
 * Settings pipeline: authorize → rate limit → work → revalidate. Timezone
 * and currency affect dates and totals on every (app) page including the
 * sidebar, so revalidation covers the whole layout.
 */
async function runSettingsMutation<T>(
  work: (ctx: { userId: string; workspaceId: string }) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const { userId, workspaceId } = await requireWorkspace();
    const limited = rateLimit(`mutation:${userId}`, MUTATION_LIMIT);
    if (!limited.ok) {
      return err("Too many changes at once. Wait a moment and retry.");
    }
    const data = await work({ userId, workspaceId });
    revalidatePath("/", "layout");
    return ok(data);
  } catch (error) {
    if (error instanceof AuthzError) return err("Not authorized");
    console.error("[settings] mutation failed:", error);
    return err(GENERIC_ERROR);
  }
}

export async function updateNameAction(input: unknown) {
  const parsed = updateNameSchema.safeParse(input);
  if (!parsed.success) return err("Enter a name of 80 characters or fewer");
  return runSettingsMutation(({ userId }) =>
    updateUserName(userId, parsed.data.name),
  );
}

export async function updateTimezoneAction(input: unknown) {
  const parsed = updateTimezoneSchema.safeParse(input);
  if (!parsed.success) return err("Pick a valid timezone");
  return runSettingsMutation(({ userId }) =>
    updateUserTimezone(userId, parsed.data.timezone),
  );
}

export async function updateDefaultCurrencyAction(input: unknown) {
  const parsed = updateCurrencySchema.safeParse(input);
  if (!parsed.success) return err("Pick a supported currency");
  return runSettingsMutation(async ({ workspaceId }) => {
    const result = await updateWorkspaceCurrency(
      workspaceId,
      parsed.data.currency,
    );
    // Best-effort: stored insights are denominated in the old currency and
    // would drop out of the savings KPI until regenerated. A failure must
    // not fail the setting change — the nightly job catches up.
    try {
      await regenerateInsights(workspaceId);
    } catch (error) {
      console.error("[insights] regeneration failed:", error);
    }
    return result;
  });
}
