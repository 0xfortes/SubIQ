import { z } from "zod";
import { BillingInterval, SubscriptionStatus } from "@/generated/prisma/enums";
import { SUPPORTED_CURRENCIES } from "@/lib/money";

const MAX_AMOUNT_MINOR = 100_000_000; // $1M — sanity bound, not a feature.

export const CATEGORY_NAME_MAX = 40;

/**
 * A user-authored category name. Sanitized by CONSTRUCTION, not by escaping:
 * the value must start alphanumeric and may then contain only letters/digits
 * from any script plus a short punctuation set. Control characters, bidi
 * overrides (Cf), angle brackets, quotes and backslashes match none of these
 * classes, so a markup or homoglyph payload can never be stored in the first
 * place. Display is React text (auto-escaped) and the URL only ever sees the
 * derived `[a-z0-9-]` slug — see lib/slug.ts.
 */
const categoryNameSchema = z
  .string()
  .transform((value) => value.normalize("NFC").replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(1, "Enter a category name")
      .max(CATEGORY_NAME_MAX, `Use ${CATEGORY_NAME_MAX} characters or fewer`)
      .regex(
        /^[\p{L}\p{N}][\p{L}\p{N} &'+./-]*$/u,
        "Use letters, numbers, spaces and & ' + . / -",
      ),
  );

// An existing category and a new name are two answers to one question.
const CATEGORY_CHOICE_ERROR = {
  message: "Pick an existing category or name a new one, not both",
  path: ["categoryName"],
};

function categoryChoiceIsUnambiguous(value: {
  categoryId?: string;
  categoryName?: string;
}): boolean {
  return !(value.categoryId && value.categoryName);
}

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
  // "Other" on the form: name a category instead of picking one. The service
  // reuses an existing match before creating anything.
  categoryName: categoryNameSchema.optional(),
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

export const createSubscriptionSchema = subscriptionFields.refine(
  categoryChoiceIsUnambiguous,
  CATEGORY_CHOICE_ERROR,
);

export const updateSubscriptionSchema = subscriptionFields
  .partial()
  .extend({ id: z.uuid() })
  .refine(categoryChoiceIsUnambiguous, CATEGORY_CHOICE_ERROR);

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
