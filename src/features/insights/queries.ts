import { db } from "@/lib/db";
import { InsightStatus } from "@/generated/prisma/enums";

export async function listActiveInsights(workspaceId: string) {
  return db.aiInsight.findMany({
    where: { workspaceId, status: InsightStatus.ACTIVE },
    orderBy: [
      { savingsMinor: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      savingsMinor: true,
      currency: true,
      subscriptionIds: true,
      createdAt: true,
    },
  });
}

export async function getWorkspaceCurrency(workspaceId: string) {
  const workspace = await db.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { defaultCurrency: true },
  });
  return workspace.defaultCurrency;
}

export async function countActiveInsights(workspaceId: string) {
  return db.aiInsight.count({
    where: { workspaceId, status: InsightStatus.ACTIVE },
  });
}
