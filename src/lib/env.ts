import { z } from "zod";

/**
 * Environment schema — the only place `process.env` is read.
 * Fails fast at boot with a readable message instead of undefined at runtime.
 * Server-only by construction (secrets never carry a NEXT_PUBLIC prefix);
 * importing from a client module makes parsing throw, not leak.
 */
const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    // Auth.js session/token signing secret — required in production.
    AUTH_SECRET: z.string().min(32).optional(),
    // Email egress (lib/email.ts). Dev logs to console; prod needs Resend.
    EMAIL_FROM: z.string().default("SubIQ <login@subiq.app>"),
    RESEND_API_KEY: z.string().min(1).optional(),
    // Bearer token for /api/cron/* — required in production.
    CRON_SECRET: z.string().min(16).optional(),
    // OAuth providers register only when both halves of a pair are present.
    AUTH_GOOGLE_ID: z.string().min(1).optional(),
    AUTH_GOOGLE_SECRET: z.string().min(1).optional(),
    AUTH_GITHUB_ID: z.string().min(1).optional(),
    AUTH_GITHUB_SECRET: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    for (const key of ["AUTH_SECRET", "CRON_SECRET"] as const) {
      if (value.NODE_ENV === "production" && !value[key]) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `${key} is required in production`,
        });
      }
    }
    for (const pair of [
      ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"],
      ["AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET"],
    ] as const) {
      const [idKey, secretKey] = pair;
      if (Boolean(value[idKey]) !== Boolean(value[secretKey])) {
        ctx.addIssue({
          code: "custom",
          path: [secretKey],
          message: `${idKey} and ${secretKey} must be set together`,
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Exported for unit tests only — application code uses `env`. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  // Treat empty strings as unset — `.env` placeholders like `KEY=""` must
  // not satisfy (or fail) validation for optional fields.
  const cleaned = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== ""),
  );
  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}

export const env = parseEnv(process.env);
