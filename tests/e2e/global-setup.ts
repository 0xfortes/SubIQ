import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { FullConfig } from "@playwright/test";
import { Client } from "pg";

const E2E_EMAIL = "e2e@subiq.local";

const CATEGORIES = [
  ["Design", "design", "#8B93FF"],
  ["Entertainment", "entertainment", "#F0708A"],
  ["AI Tools", "ai-tools", "#C9A0F5"],
  ["Dev & Infra", "dev-infra", "#6FA8F5"],
  ["Productivity", "productivity", "#4FD1A1"],
  ["Health", "health", "#F2B25C"],
] as const;

/**
 * Authenticate by writing a real DB session + cookie instead of driving
 * the magic-link email flow — deterministic and fast. Raw SQL via pg
 * because Playwright's TS loader can't import the generated Prisma client.
 */
export default async function globalSetup(_config: FullConfig) {
  const envFile = path.join(__dirname, "..", "..", ".env");
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const userResult = await client.query<{ id: string }>(
    `INSERT INTO "User" (id, email, name, "emailVerified", "createdAt", "updatedAt")
     VALUES ($1, $2, 'E2E', now(), now(), now())
     ON CONFLICT (email) DO UPDATE SET "updatedAt" = now()
     RETURNING id`,
    [randomUUID(), E2E_EMAIL],
  );
  const userId = userResult.rows[0]!.id;

  const membership = await client.query(
    `SELECT "workspaceId" FROM "WorkspaceMember" WHERE "userId" = $1 LIMIT 1`,
    [userId],
  );
  if (membership.rowCount === 0) {
    const workspaceId = randomUUID();
    await client.query(
      `INSERT INTO "Workspace" (id, name, "defaultCurrency", "createdAt", "updatedAt")
       VALUES ($1, 'Personal', 'USD', now(), now())`,
      [workspaceId],
    );
    await client.query(
      `INSERT INTO "WorkspaceMember" (id, "workspaceId", "userId", role, "createdAt")
       VALUES ($1, $2, $3, 'OWNER', now())`,
      [randomUUID(), workspaceId, userId],
    );
    for (const [name, slug, color] of CATEGORIES) {
      await client.query(
        `INSERT INTO "Category" (id, "workspaceId", name, slug, color, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, now(), now())`,
        [randomUUID(), workspaceId, name, slug, color],
      );
    }
  }

  // Remove rows interrupted runs left behind — they accumulate and push
  // the working row under the toast stack, deadlocking pointer clicks.
  await client.query(
    `DELETE FROM "Subscription"
     WHERE name LIKE 'E2E Sub %'
       AND "workspaceId" IN (SELECT "workspaceId" FROM "WorkspaceMember" WHERE "userId" = $1)`,
    [userId],
  );

  // Two stable seed rows: the bulk-selection spec needs at least two
  // visible subscriptions. Idempotent, and un-archives them if a crashed
  // run left them archived (bulk archive without the undo).
  const workspaceRow = await client.query<{ workspaceId: string }>(
    `SELECT "workspaceId" FROM "WorkspaceMember" WHERE "userId" = $1 LIMIT 1`,
    [userId],
  );
  const seedWorkspaceId = workspaceRow.rows[0]!.workspaceId;
  const nextRenewal = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
  for (const [name, amountMinor] of [
    ["E2E Seed Streaming", 1299],
    ["E2E Seed Music", 999],
  ] as const) {
    const existing = await client.query(
      `SELECT id FROM "Subscription" WHERE "workspaceId" = $1 AND name = $2`,
      [seedWorkspaceId, name],
    );
    if (existing.rowCount === 0) {
      await client.query(
        `INSERT INTO "Subscription"
           (id, "workspaceId", name, "amountMinor", currency, interval,
            "intervalCount", "anchorDate", "nextRenewalAt", status,
            "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'USD', 'MONTH', 1, CURRENT_DATE, $5,
                 'ACTIVE', now(), now())`,
        [randomUUID(), seedWorkspaceId, name, amountMinor, nextRenewal],
      );
    } else {
      await client.query(
        `UPDATE "Subscription" SET "deletedAt" = NULL, "updatedAt" = now()
         WHERE id = $1`,
        [existing.rows[0]!.id],
      );
    }
  }

  // Normalize settings the settings spec mutates, so a crashed run can't
  // poison later ones (subscriptions.spec asserts "$" formatting).
  await client.query(`UPDATE "User" SET timezone = 'UTC' WHERE id = $1`, [
    userId,
  ]);
  await client.query(
    `UPDATE "Workspace" SET "defaultCurrency" = 'USD'
     WHERE id IN (SELECT "workspaceId" FROM "WorkspaceMember" WHERE "userId" = $1)`,
    [userId],
  );

  // Remove the account auth.spec.ts registers, so its register flow is
  // idempotent across runs. Delete the workspace first (cascades its members),
  // then the user (cascades sessions/accounts).
  await client.query(
    `DELETE FROM "Workspace" WHERE id IN (
       SELECT wm."workspaceId" FROM "WorkspaceMember" wm
       JOIN "User" u ON u.id = wm."userId"
       WHERE u.email = 'e2e-auth@subiq.local'
     )`,
  );
  await client.query(`DELETE FROM "User" WHERE email = 'e2e-auth@subiq.local'`);

  // The E2E user's session is minted directly here (database session
  // strategy) and paired with the cookie in storageState below.
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await client.query(
    `INSERT INTO "Session" (id, "sessionToken", "userId", expires)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), sessionToken, userId, expires],
  );
  await client.end();

  const storageState = path.join(__dirname, ".auth", "user.json");
  fs.mkdirSync(path.dirname(storageState), { recursive: true });
  fs.writeFileSync(
    storageState,
    JSON.stringify({
      cookies: [
        {
          name: "authjs.session-token",
          value: sessionToken,
          domain: "localhost",
          path: "/",
          expires: Math.floor(expires.getTime() / 1000),
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    }),
  );
}
