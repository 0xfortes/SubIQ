import { z } from "zod";
import { isValidTimeZone } from "@/lib/dates";
import { SUPPORTED_CURRENCIES } from "@/lib/money";

/**
 * The settings page saves as one unit — a single form, a single action, a
 * single rate-limit budget. Splitting it per field would make a partial
 * failure ("timezone saved, currency didn't") representable, and it isn't.
 */
export const updateSettingsSchema = z.object({
  // Name is optional on the User model; an empty submission clears it (→ null).
  name: z
    .string()
    .trim()
    .max(80)
    .transform((value) => (value === "" ? null : value)),
  timezone: z
    .string()
    .min(1)
    .max(64)
    .refine(isValidTimeZone, "Pick a valid timezone"),
  currency: z.enum(SUPPORTED_CURRENCIES),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
