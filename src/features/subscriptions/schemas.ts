import { z } from "zod";
import { BillingInterval, SubscriptionStatus } from "@/generated/prisma/enums";
import { SUPPORTED_CURRENCIES } from "@/lib/money";

const MAX_AMOUNT_MINOR = 100_000_000; // $1M — sanity bound, not a feature.

const subscriptionFields = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  vendor: z.string().trim().max(100).optional(),
  // http(s) only — a stored `javascript:`/`data:` URL would be an XSS payload
  // the moment this field is ever rendered as a link.
  url: z
    .url("Enter a valid URL")
    .refine((v) => /^https?:\/\//i.test(v), "Use an http(s) link")
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().max(2000).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Use a #RRGGBB hex color")
    .optional(),
  categoryId: z.uuid().optional(),
  amountMinor: z.number().int().min(0).max(MAX_AMOUNT_MINOR),
  // A real enum, not just an ISO-4217-shaped string: an unsupported code would
  // be stored and then silently treated 1:1 by the FX layer (wrong totals).
  currency: z.preprocess(
    (v) => (typeof v === "string" ? v.toUpperCase() : v),
    z.enum(SUPPORTED_CURRENCIES),
  ),
  interval: z.enum(BillingInterval),
  intervalCount: z.number().int().min(1).max(36).default(1),
  anchorDate: z.coerce.date(),
  status: z.enum(SubscriptionStatus).default(SubscriptionStatus.ACTIVE),
  trialEndsAt: z.coerce.date().optional(),
});

export const createSubscriptionSchema = subscriptionFields;

export const updateSubscriptionSchema = subscriptionFields.partial().extend({
  id: z.uuid(),
});

export const subscriptionIdSchema = z.object({ id: z.uuid() });

export const subscriptionIdsSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(100),
});

export const toggleFavoriteSchema = z.object({
  id: z.uuid(),
  isFavorite: z.boolean(),
});

// "archived" is a lifecycle filter (deletedAt), not a status — it rides in
// the same chip row for one shared, URL-driven filter mechanism.
export const STATUS_FILTERS = [
  "all",
  "active",
  "trial",
  "paused",
  "archived",
] as const;
export const SORT_OPTIONS = ["renewal", "name", "cost"] as const;

export const listFiltersSchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(STATUS_FILTERS).default("all"),
  category: z.string().trim().max(100).optional(),
  sort: z.enum(SORT_OPTIONS).default("cost"),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type ListFilters = z.infer<typeof listFiltersSchema>;
export type StatusFilter = (typeof STATUS_FILTERS)[number];
export type SortOption = (typeof SORT_OPTIONS)[number];
