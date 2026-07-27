import { db } from "@/lib/db";

export async function updateUserTimezone(userId: string, timezone: string) {
  return db.user.update({
    where: { id: userId },
    data: { timezone },
    select: { timezone: true },
  });
}

export async function updateWorkspaceCurrency(
  workspaceId: string,
  currency: string,
) {
  return db.workspace.update({
    where: { id: workspaceId },
    data: { defaultCurrency: currency },
    select: { defaultCurrency: true },
  });
}
