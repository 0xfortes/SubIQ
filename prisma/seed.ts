/**
 * Dev seed: a demo user with a personal workspace, the six default
 * categories, and a realistic spread of subscriptions (statuses, cadences,
 * trials) so dashboard and CRUD work has something to render.
 *
 * Idempotent: re-running resets the demo user's subscriptions.
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  BillingInterval,
  SubscriptionStatus,
} from "../src/generated/prisma/enums";
import { computeNextRenewalAt } from "../src/lib/recurrence";

// tsx doesn't load .env; use Node's native loader.
const envFile = path.join(__dirname, "..", ".env");
if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const DEMO_EMAIL = "dev@subiq.local";

const CATEGORIES = [
  { name: "Design", slug: "design", color: "#8B93FF" },
  { name: "Entertainment", slug: "entertainment", color: "#F0708A" },
  { name: "AI Tools", slug: "ai-tools", color: "#C9A0F5" },
  { name: "Dev & Infra", slug: "dev-infra", color: "#6FA8F5" },
  { name: "Productivity", slug: "productivity", color: "#4FD1A1" },
  { name: "Health", slug: "health", color: "#F2B25C" },
] as const;

type CategorySlug = (typeof CATEGORIES)[number]["slug"];

interface SeedSubscription {
  name: string;
  vendor?: string;
  category: CategorySlug;
  amountMinor: number;
  currency: string;
  interval: BillingInterval;
  intervalCount?: number;
  /** Days relative to today for the anchor date. */
  anchorOffsetDays: number;
  status?: SubscriptionStatus;
  trialEndsInDays?: number;
  isFavorite?: boolean;
  color?: string;
}

const SUBSCRIPTIONS: SeedSubscription[] = [
  {
    name: "Figma",
    vendor: "Figma Inc.",
    category: "design",
    amountMinor: 1500,
    currency: "USD",
    interval: BillingInterval.MONTH,
    anchorOffsetDays: -200,
    isFavorite: true,
    color: "#A259FF",
  },
  {
    name: "Adobe Creative Cloud",
    vendor: "Adobe",
    category: "design",
    amountMinor: 5999,
    currency: "USD",
    interval: BillingInterval.MONTH,
    anchorOffsetDays: -420,
    color: "#FF0000",
  },
  {
    name: "Netflix",
    category: "entertainment",
    amountMinor: 1549,
    currency: "USD",
    interval: BillingInterval.MONTH,
    anchorOffsetDays: -800,
    color: "#E50914",
  },
  {
    name: "Spotify",
    category: "entertainment",
    amountMinor: 1099,
    currency: "USD",
    interval: BillingInterval.MONTH,
    anchorOffsetDays: -600,
    isFavorite: true,
    color: "#1DB954",
  },
  {
    name: "Disney+",
    category: "entertainment",
    amountMinor: 9990,
    currency: "USD",
    interval: BillingInterval.YEAR,
    anchorOffsetDays: -300,
    color: "#01147C",
  },
  {
    name: "ChatGPT Plus",
    vendor: "OpenAI",
    category: "ai-tools",
    amountMinor: 2000,
    currency: "USD",
    interval: BillingInterval.MONTH,
    anchorOffsetDays: -90,
    color: "#10A37F",
  },
  {
    name: "Claude Pro",
    vendor: "Anthropic",
    category: "ai-tools",
    amountMinor: 2000,
    currency: "USD",
    interval: BillingInterval.MONTH,
    anchorOffsetDays: -45,
    isFavorite: true,
    color: "#D97757",
  },
  {
    name: "Midjourney",
    category: "ai-tools",
    amountMinor: 1000,
    currency: "USD",
    interval: BillingInterval.MONTH,
    anchorOffsetDays: 0,
    status: SubscriptionStatus.TRIAL,
    trialEndsInDays: 11,
  },
  {
    name: "Vercel Pro",
    vendor: "Vercel",
    category: "dev-infra",
    amountMinor: 2000,
    currency: "USD",
    interval: BillingInterval.MONTH,
    anchorOffsetDays: -150,
  },
  {
    name: "GitHub Copilot",
    vendor: "GitHub",
    category: "dev-infra",
    amountMinor: 10000,
    currency: "USD",
    interval: BillingInterval.YEAR,
    anchorOffsetDays: -160,
    color: "#8957E5",
  },
  {
    name: "Hetzner VPS",
    vendor: "Hetzner",
    category: "dev-infra",
    amountMinor: 549,
    currency: "EUR",
    interval: BillingInterval.MONTH,
    anchorOffsetDays: -75,
  },
  {
    name: "Notion",
    category: "productivity",
    amountMinor: 1200,
    currency: "USD",
    interval: BillingInterval.MONTH,
    anchorOffsetDays: -365,
  },
  {
    name: "Todoist",
    category: "productivity",
    amountMinor: 4800,
    currency: "USD",
    interval: BillingInterval.YEAR,
    anchorOffsetDays: -340,
    status: SubscriptionStatus.PAUSED,
  },
  {
    name: "1Password",
    category: "productivity",
    amountMinor: 3588,
    currency: "USD",
    interval: BillingInterval.YEAR,
    anchorOffsetDays: -500,
  },
  {
    name: "Whoop",
    category: "health",
    amountMinor: 3000,
    currency: "USD",
    interval: BillingInterval.MONTH,
    anchorOffsetDays: -120,
    color: "#00A0DC",
  },
  {
    name: "Headspace",
    category: "health",
    amountMinor: 6999,
    currency: "USD",
    interval: BillingInterval.YEAR,
    anchorOffsetDays: -80,
    status: SubscriptionStatus.CANCELLED,
  },
];

function daysFromToday(days: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days),
  );
}

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? "",
  });
  const db = new PrismaClient({ adapter });

  const user = await db.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL, name: "Demo User", emailVerified: new Date() },
  });

  let membership = await db.workspaceMember.findFirst({
    where: { userId: user.id },
    select: { workspaceId: true },
  });
  if (!membership) {
    const workspace = await db.workspace.create({
      data: {
        name: "Personal",
        members: { create: { userId: user.id, role: "OWNER" } },
        categories: { create: [...CATEGORIES] },
      },
      select: { id: true },
    });
    membership = { workspaceId: workspace.id };
  }
  const workspaceId = membership.workspaceId;

  const categories = await db.category.findMany({
    where: { workspaceId },
    select: { id: true, slug: true },
  });
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  await db.subscription.deleteMany({ where: { workspaceId } });

  const now = new Date();
  for (const sub of SUBSCRIPTIONS) {
    const anchorDate = daysFromToday(sub.anchorOffsetDays);
    await db.subscription.create({
      data: {
        workspaceId,
        categoryId: categoryBySlug.get(sub.category) ?? null,
        name: sub.name,
        vendor: sub.vendor ?? null,
        color: sub.color ?? null,
        isFavorite: sub.isFavorite ?? false,
        amountMinor: sub.amountMinor,
        currency: sub.currency,
        interval: sub.interval,
        intervalCount: sub.intervalCount ?? 1,
        anchorDate,
        nextRenewalAt: computeNextRenewalAt(
          anchorDate,
          sub.interval,
          sub.intervalCount ?? 1,
          now,
        ),
        status: sub.status ?? SubscriptionStatus.ACTIVE,
        trialEndsAt:
          sub.trialEndsInDays !== undefined
            ? daysFromToday(sub.trialEndsInDays)
            : null,
      },
    });
  }

  console.log(
    `Seeded ${SUBSCRIPTIONS.length} subscriptions for ${DEMO_EMAIL} (workspace ${workspaceId}).`,
  );
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
