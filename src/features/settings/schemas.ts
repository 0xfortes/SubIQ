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

export type UpdateTimezoneInput = z.infer<typeof updateTimezoneSchema>;
export type UpdateCurrencyInput = z.infer<typeof updateCurrencySchema>;
