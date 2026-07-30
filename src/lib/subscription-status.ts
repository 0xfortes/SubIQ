import { SubscriptionStatus } from "@/generated/prisma/enums";

/**
 * Statuses that still bill — i.e. contribute to spend totals and upcoming
 * renewals. Shared by the dashboard and analytics aggregations so the set
 * lives in exactly one place.
 */
export const BILLING_STATUSES = new Set<SubscriptionStatus>([
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIAL,
]);
