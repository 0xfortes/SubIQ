import { z } from "zod";
import { isValidTimeZone } from "@/lib/dates";
import { SUPPORTED_CURRENCIES } from "@/lib/money";

export const updateTimezoneSchema = z.object({
  timezone: z
    .string()
    .min(1)
    .max(64)
    .refine(isValidTimeZone, "Pick a valid timezone"),
});

export const updateCurrencySchema = z.object({
  currency: z.enum(SUPPORTED_CURRENCIES),
});

// Name is optional on the User model; an empty submission clears it (→ null).
export const updateNameSchema = z.object({
  name: z
    .string()
    .trim()
    .max(80)
    .transform((value) => (value === "" ? null : value)),
});
