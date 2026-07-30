import type { Metadata } from "next";
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

export default function LandingPage() {
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
