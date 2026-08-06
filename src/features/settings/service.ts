import { db } from "@/lib/db";
import type { UpdateSettingsInput } from "./schemas";

/**
 * Apply the whole settings form atomically. Both rows are written every time
 * — the updates are idempotent, and comparing field-by-field to skip a write
 * would buy nothing at this size.
 *
 * `currencyChanged` is derived from the row we're about to overwrite, never
 * from a client-supplied "previous" value: it decides whether stored insights
 * (denominated in the old currency) need regenerating.
 */
export async function updateSettings(
  userId: string,
  workspaceId: string,
  input: UpdateSettingsInput,
) {
  return db.$transaction(async (tx) => {
    const before = await tx.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { defaultCurrency: true },
    });

    const [user, workspace] = await Promise.all([
      tx.user.update({
        where: { id: userId },
        data: { name: input.name, timezone: input.timezone },
        select: { name: true, timezone: true },
      }),
      tx.workspace.update({
        where: { id: workspaceId },
        data: { defaultCurrency: input.currency },
        select: { defaultCurrency: true },
      }),
    ]);

    return {
      name: user.name,
      timezone: user.timezone,
      defaultCurrency: workspace.defaultCurrency,
      currencyChanged: before.defaultCurrency !== workspace.defaultCurrency,
    };
  });
}
