import { z } from "zod";
import { isSafeInternalPath } from "@/lib/safe-redirect";

const email = z.email("Enter a valid email address").toLowerCase();
// Bounded so scrypt cost stays predictable; 8 is the practical strength floor.
const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Use at most 128 characters");
// Same-origin relative paths only — blocks open-redirect via `//host`.
const callbackUrl = z.string().refine(isSafeInternalPath).optional();

export const registerSchema = z
  .object({
    // Optional on the User model; empty → null (mirrors the settings name field).
    name: z
      .string()
      .trim()
      .max(80, "Use at most 80 characters")
      .transform((value) => (value === "" ? null : value)),
    email,
    password,
    confirmPassword: z.string(),
    callbackUrl,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
  callbackUrl,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
