"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { InsightStatus } from "@/generated/prisma/enums";
import { err, ok, GENERIC_ERROR, type ActionResult } from "@/lib/errors";
import { AuthzError, requireWorkspace } from "@/server/authz";
import { rateLimit } from "@/server/rate-limit";

const dismissSchema = z.object({ id: z.uuid() });

export async function dismissInsightAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = dismissSchema.safeParse(input);
  if (!parsed.success) return err(GENERIC_ERROR);

  try {
    const { userId, workspaceId } = await requireWorkspace();
    const limited = rateLimit(`mutation:${userId}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!limited.ok) return err("Too many changes at once. Retry shortly.");

    const result = await db.aiInsight.updateMany({
      where: {
        id: parsed.data.id,
        workspaceId,
        status: InsightStatus.ACTIVE,
      },
      data: { status: InsightStatus.DISMISSED, dismissedAt: new Date() },
    });
    if (result.count === 0) return err("Insight not found");

    revalidatePath("/dashboard");
    revalidatePath("/insights");
    return ok({ id: parsed.data.id });
  } catch (error) {
    if (error instanceof AuthzError) return err("Not authorized");
    console.error("[insights] dismiss failed:", error);
    return err(GENERIC_ERROR);
  }
}
