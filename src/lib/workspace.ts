import { db } from "@/lib/db";

// Seed categories per DESIGN.md's palette. The Category row is the
// canonical home of each color; these are creation-time values only.
export const DEFAULT_CATEGORIES = [
  { name: "Design", slug: "design", color: "#8B93FF" },
  { name: "Entertainment", slug: "entertainment", color: "#F0708A" },
  { name: "AI Tools", slug: "ai-tools", color: "#C9A0F5" },
  { name: "Dev & Infra", slug: "dev-infra", color: "#6FA8F5" },
  { name: "Productivity", slug: "productivity", color: "#4FD1A1" },
  { name: "Health", slug: "health", color: "#F2B25C" },
] as const;

/**
 * v1 tenancy: one personal workspace per user, created on first sign-in
 * (Auth.js createUser event). Idempotent — a retried event won't duplicate.
 */
export async function bootstrapPersonalWorkspace(userId: string) {
  const existing = await db.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  });
  if (existing) return existing.workspaceId;

  const workspace = await db.workspace.create({
    data: {
      name: "Personal",
      members: { create: { userId, role: "OWNER" } },
      categories: { create: [...DEFAULT_CATEGORIES] },
    },
    select: { id: true },
  });
  return workspace.id;
}
