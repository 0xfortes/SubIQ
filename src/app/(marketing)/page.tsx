import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { requireWorkspace } from "@/server/authz";
import {
  fetchWorkspaceSubs,
  getDashboardData,
  HomeOverview,
} from "@/features/dashboard";
import { listActiveInsights, recoverableTotalMinor } from "@/features/insights";
import { getUserTimezone } from "@/features/settings";
import {
  FeatureSections,
  Hero,
  HowItWorks,
  ProductPreview,
  SignupCta,
} from "@/features/marketing";

export const metadata: Metadata = {
  title: "SubIQ: track your subscriptions and renewals",
  description:
    "SubIQ tracks what you're subscribed to and reminds you before each renewal charges. See your monthly total and what's coming, in one place. Free to start, no card.",
};

export default async function LandingPage() {
  const session = await auth();

  // Logged-out visitors get the marketing landing.
  if (!session?.user) {
    return (
      <>
        <Hero />
        <ProductPreview />
        <FeatureSections />
        <HowItWorks />
        <SignupCta />
      </>
    );
  }

  // Returning users get a personalized overview instead of acquisition copy.
  const { userId, workspaceId } = await requireWorkspace();
  const timeZone = await getUserTimezone(userId);
  const [data, insights, [, subs]] = await Promise.all([
    getDashboardData(workspaceId, undefined, timeZone),
    listActiveInsights(workspaceId),
    // cache()-shared with getDashboardData's fetch — no extra query.
    fetchWorkspaceSubs(workspaceId),
  ]);
  const savings = recoverableTotalMinor(insights, data.defaultCurrency);
  const name =
    session.user.name?.trim().split(" ")[0] ??
    session.user.email?.split("@")[0] ??
    null;

  return (
    <HomeOverview
      name={name}
      isEmpty={subs.length === 0}
      kpis={data.kpis}
      savingsMinor={savings}
      insights={insights}
      rulerItems={data.rulerItems}
      rulerTotalMinor={data.rulerTotalMinor}
      currency={data.defaultCurrency}
      timeZone={timeZone}
    />
  );
}
