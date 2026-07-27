import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer auto-loads .env — do it here (Node's native loader).
const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

// Migrations (this CLI config) need a DIRECT database connection: a
// transaction-mode pooler (Supabase Supavisor / pgBouncer on 6543) breaks DDL,
// advisory locks and multi-statement transactions. The runtime client keeps
// using the pooled DATABASE_URL via the pg adapter (src/lib/db.ts). DIRECT_URL
// is optional — local dev with a single direct Postgres falls back to
// DATABASE_URL.
const migrationUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!migrationUrl) {
  throw new Error("Prisma CLI needs DIRECT_URL or DATABASE_URL set.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrationUrl,
  },
});
