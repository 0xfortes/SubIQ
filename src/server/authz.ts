import { cache } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Authorization chain used by EVERY server action and route handler:
 * session → workspace membership → (per-resource ownership in the feature
 * service, always filtered by workspaceId). UI hiding a button is never
 * authorization.
 */

export class AuthzError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "AuthzError";
  }
}

/** Session or throw. Cached per request. */
export const requireUser = cache(async () => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new AuthzError("Not authenticated");
  return { userId, email: session.user.email ?? null };
});

/**
 * Session + workspace membership or throw. v1: the user's single personal
 * workspace. Cached per request.
 */
export const requireWorkspace = cache(async () => {
  const { userId } = await requireUser();
  const membership = await db.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true, role: true },
  });
  if (!membership) throw new AuthzError("No workspace membership");
  return { userId, workspaceId: membership.workspaceId, role: membership.role };
});
