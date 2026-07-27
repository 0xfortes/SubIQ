import { cache } from "react";
import { db } from "@/lib/db";

/** The user's IANA timezone for presentation. Cached per request. */
export const getUserTimezone = cache(
  async (userId: string): Promise<string> => {
    const user = await db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { timezone: true },
    });
    return user.timezone;
  },
);

/** Everything the settings page renders. Cached per request. */
export const getSettings = cache(
  async (userId: string, workspaceId: string) => {
    const [user, workspace] = await Promise.all([
      db.user.findUniqueOrThrow({
        where: { id: userId },
        select: { email: true, name: true, timezone: true },
      }),
      db.workspace.findUniqueOrThrow({
        where: { id: workspaceId },
        select: { name: true, defaultCurrency: true },
      }),
    ]);
    return { user, workspace };
  },
);
